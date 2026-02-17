import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import path from "path";
import fs from "fs/promises";
import sharp from "@/lib/sharp-config";
import { detectTextFromImage } from "@/lib/rekognition";
import { generateWatermarkedThumbnail as createWatermark } from "@/lib/watermark";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./public/uploads";
const WEB_MAX_DIMENSION = 1600;
const WEB_JPEG_QUALITY = 80;

async function generateWebVersion(
  originalPath: string,
  eventId: string,
  filename: string
): Promise<{ webPath: string; jpegBuffer: Buffer }> {
  const webDir = path.join(UPLOAD_DIR, eventId, "web");
  await fs.mkdir(webDir, { recursive: true });

  const webFilename = `web_${path.parse(filename).name}.webp`;
  const diskPath = path.join(webDir, webFilename);

  // JPEG buffer for AWS Rekognition (requires JPEG/PNG)
  const jpegBuffer = await sharp(originalPath)
    .resize(WEB_MAX_DIMENSION, WEB_MAX_DIMENSION, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: WEB_JPEG_QUALITY, mozjpeg: true })
    .toBuffer();

  // WebP on disk for gallery display
  const webpBuffer = await sharp(jpegBuffer)
    .webp({ quality: WEB_JPEG_QUALITY })
    .toBuffer();

  await fs.writeFile(diskPath, webpBuffer);

  return { webPath: `/uploads/${eventId}/web/${webFilename}`, jpegBuffer };
}

// Removed: use the real watermark function from @/lib/watermark instead

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

    console.log(`🚀 Starting reprocessing of ${photos.length} photos`);

    for (const photo of photos) {
      try {
        console.log(`📸 Processing: ${photo.path}`);

        // Extract eventId and filename from path
        const pathParts = photo.path.split("/");
        const eventId = pathParts[2];
        const filename = pathParts[3];
        const originalPath = path.join(UPLOAD_DIR, eventId, filename);

        // Check if file exists
        try {
          await fs.access(originalPath);
        } catch {
          console.error(`❌ File not found: ${originalPath}`);
          results.failed++;
          results.errors.push(`File not found: ${photo.path}`);
          continue;
        }

        // Generate web version (WebP on disk, JPEG buffer for AI)
        const { webPath, jpegBuffer } = await generateWebVersion(originalPath, eventId, filename);

        // Generate watermarked thumbnail using the JPEG buffer
        const thumbnailPath = await createWatermark(eventId, jpegBuffer, filename);

        const validBibs = new Set(
          photo.event.startListEntries.map((e) => e.bibNumber)
        );

        console.log(`  ✓ Running OCR...`);
        const ocrResult = await detectTextFromImage(
          jpegBuffer,
          validBibs.size > 0 ? validBibs : undefined
        );

        console.log(
          `  ✓ OCR found ${ocrResult.bibNumbers.length} bib(s): ${ocrResult.bibNumbers.join(", ") || "none"}`
        );

        // Update photo in DB
        await prisma.photo.update({
          where: { id: photo.id },
          data: {
            webPath,
            thumbnailPath,
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
        console.log(`✅ Successfully reprocessed photo ${photo.id}`);
      } catch (error) {
        console.error(`❌ Error reprocessing photo ${photo.id}:`, error);
        results.failed++;
        results.errors.push(
          `Photo ${photo.id}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    console.log(`\n✅ Reprocessing complete: ${results.processed}/${results.total} succeeded`);

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
