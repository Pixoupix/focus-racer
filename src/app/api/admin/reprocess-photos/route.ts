import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import sharp from "@/lib/sharp-config";
import { detectTextFromImage } from "@/lib/rekognition";
import { generateWatermarkedThumbnail as createWatermark } from "@/lib/watermark";
import { getFromS3AsBuffer, uploadToS3, getS3Key, publicPathToS3Key } from "@/lib/s3";

/** Get the S3 key for a photo, handling both new (S3 key) and legacy (local path) formats */
function getPhotoS3Key(photo: { path: string; s3Key?: string | null }): string {
  if (photo.path.startsWith("events/")) return photo.path;
  if (photo.s3Key) return photo.s3Key;
  return publicPathToS3Key(photo.path);
}

const WEB_MAX_DIMENSION = 1600;
const WEB_JPEG_QUALITY = 80;

async function generateWebVersion(
  originalBuffer: Buffer,
  eventId: string,
  filename: string
): Promise<{ webS3Key: string; jpegBuffer: Buffer }> {
  const webFilename = `web_${filename.replace(/\.[^.]+$/, "")}.webp`;
  const webS3Key = getS3Key(eventId, webFilename, "web");

  // JPEG buffer for AWS Rekognition (requires JPEG/PNG)
  const jpegBuffer = await sharp(originalBuffer)
    .resize(WEB_MAX_DIMENSION, WEB_MAX_DIMENSION, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: WEB_JPEG_QUALITY, mozjpeg: true })
    .toBuffer();

  // WebP for S3 storage (gallery display)
  const webpBuffer = await sharp(jpegBuffer)
    .webp({ quality: WEB_JPEG_QUALITY })
    .toBuffer();

  await uploadToS3(webpBuffer, webS3Key, "image/webp");

  return { webS3Key, jpegBuffer };
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get all photos without webPath or thumbnailPath
    const photos = await prisma.photo.findMany({
      where: {
        OR: [{ webPath: null }, { thumbnailPath: null }],
      },
      include: { event: { include: { startListEntries: true } } },
      orderBy: { createdAt: "desc" },
    });

    const results = {
      total: photos.length,
      processed: 0,
      failed: 0,
      errors: [] as string[],
    };

    console.log(`Starting reprocessing of ${photos.length} photos`);

    for (const photo of photos) {
      try {
        console.log(`Processing: ${photo.path}`);

        // Read original from S3
        const s3Key = getPhotoS3Key(photo);
        let originalBuffer: Buffer;
        try {
          originalBuffer = await getFromS3AsBuffer(s3Key);
        } catch {
          console.error(`File not found in S3: ${s3Key}`);
          results.failed++;
          results.errors.push(`File not found: ${s3Key}`);
          continue;
        }

        // Extract eventId and filename from S3 key
        // S3 key format: events/{eventId}/originals/{filename}
        const keyParts = s3Key.split("/");
        const eventId = keyParts[1];
        const filename = keyParts[3];

        // Generate web version (WebP to S3, JPEG buffer for AI)
        const { webS3Key, jpegBuffer } = await generateWebVersion(originalBuffer, eventId, filename);

        // Generate watermarked thumbnail using the JPEG buffer
        const thumbnailS3Key = await createWatermark(eventId, jpegBuffer, filename);

        const validBibs = new Set(
          photo.event.startListEntries.map((e) => e.bibNumber)
        );

        console.log(`  Running OCR...`);
        const ocrResult = await detectTextFromImage(
          jpegBuffer,
          validBibs.size > 0 ? validBibs : undefined
        );

        console.log(
          `  OCR found ${ocrResult.bibNumbers.length} bib(s): ${ocrResult.bibNumbers.join(", ") || "none"}`
        );

        // Update photo in DB
        await prisma.photo.update({
          where: { id: photo.id },
          data: {
            webPath: webS3Key,
            thumbnailPath: thumbnailS3Key,
            ocrProvider: "ocr_aws",
          },
        });

        // Create/update bib numbers
        if (ocrResult.bibNumbers.length > 0) {
          await prisma.bibNumber.deleteMany({ where: { photoId: photo.id } });

          for (const bibNum of ocrResult.bibNumbers) {
            await prisma.bibNumber.create({
              data: {
                photoId: photo.id,
                number: bibNum,
                confidence: ocrResult.confidence,
                source: "ocr_aws",
              },
            });
          }
        }

        results.processed++;
        console.log(`Successfully reprocessed photo ${photo.id}`);
      } catch (error) {
        console.error(`Error reprocessing photo ${photo.id}:`, error);
        results.failed++;
        results.errors.push(
          `Photo ${photo.id}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    console.log(`\nReprocessing complete: ${results.processed}/${results.total} succeeded`);

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error("Reprocessing error:", error);
    return NextResponse.json(
      {
        error: "Failed to reprocess photos",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
