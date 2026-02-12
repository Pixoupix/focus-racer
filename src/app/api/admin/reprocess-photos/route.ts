import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import path from "path";
import fs from "fs/promises";
import sharp from "sharp";
import { extractBibNumbers } from "@/lib/ocr";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./public/uploads";
const WEB_MAX_DIMENSION = 1600;
const WEB_JPEG_QUALITY = 80;
const WATERMARK_TEXT = "FOCUS RACER";
const WATERMARK_OPACITY = 0.3;

async function generateWebVersion(
  originalPath: string,
  eventId: string,
  filename: string
): Promise<string> {
  const webDir = path.join(UPLOAD_DIR, eventId, "web");
  await fs.mkdir(webDir, { recursive: true });

  const webFilename = `web_${path.parse(filename).name}.jpg`;
  const webPath = path.join(webDir, webFilename);

  await sharp(originalPath)
    .resize(WEB_MAX_DIMENSION, WEB_MAX_DIMENSION, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: WEB_JPEG_QUALITY, mozjpeg: true })
    .toFile(webPath);

  return `/uploads/${eventId}/web/${webFilename}`;
}

async function generateWatermarkedThumbnail(
  originalPath: string,
  eventId: string,
  filename: string
): Promise<string> {
  const thumbDir = path.join(UPLOAD_DIR, eventId, "thumbnails");
  await fs.mkdir(thumbDir, { recursive: true });

  const thumbFilename = `thumb_${path.parse(filename).name}.jpg`;
  const thumbPath = path.join(thumbDir, thumbFilename);

  // First, resize the image to get final dimensions
  const resizedImage = sharp(originalPath).resize(800, 600, {
    fit: "inside",
    withoutEnlargement: true,
  });

  const metadata = await resizedImage.metadata();
  const width = metadata.width || 800;
  const height = metadata.height || 600;

  // Create watermark SVG with the RESIZED dimensions
  const watermarkSvg = Buffer.from(`
    <svg width="${width}" height="${height}">
      <style>
        .watermark {
          fill: white;
          font-size: ${Math.min(width, height) * 0.08}px;
          font-family: Arial, sans-serif;
          font-weight: bold;
          opacity: ${WATERMARK_OPACITY};
        }
      </style>
      <text x="50%" y="50%" text-anchor="middle" class="watermark">
        ${WATERMARK_TEXT}
      </text>
    </svg>
  `);

  // Apply watermark to the resized image
  await resizedImage
    .composite([{ input: watermarkSvg, gravity: "center" }])
    .jpeg({ quality: 80 })
    .toFile(thumbPath);

  return `/uploads/${eventId}/thumbnails/${thumbFilename}`;
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

        // Generate web version
        const webPath = await generateWebVersion(originalPath, eventId, filename);

        // Generate watermarked thumbnail
        const thumbnailPath = await generateWatermarkedThumbnail(
          originalPath,
          eventId,
          filename
        );

        // Run OCR on web version
        const webFilePath = path.join(
          UPLOAD_DIR,
          eventId,
          "web",
          `web_${path.parse(filename).name}.jpg`
        );

        const validBibs = new Set(
          photo.event.startListEntries.map((e) => e.bibNumber)
        );

        console.log(`  ✓ Running OCR...`);
        const ocrResult = await extractBibNumbers(
          webFilePath,
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
            ocrProvider: ocrResult.provider,
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
                source: ocrResult.provider,
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
