import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs/promises";
import sharp from "sharp";
import { extractBibNumbers } from "../src/lib/ocr";

const prisma = new PrismaClient();
const UPLOAD_DIR = process.env.UPLOAD_DIR || "./public/uploads";

// Web version config
const WEB_MAX_DIMENSION = 1600;
const WEB_JPEG_QUALITY = 80;

// Watermark config
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

  console.log(`  ✓ Creating web version: ${webFilename}`);

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

  console.log(`  ✓ Creating watermarked thumbnail: ${thumbFilename}`);

  const image = sharp(originalPath);
  const metadata = await image.metadata();

  const width = metadata.width || 800;
  const height = metadata.height || 600;

  // Create watermark SVG
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

  await image
    .resize(800, 600, { fit: "inside", withoutEnlargement: true })
    .composite([{ input: watermarkSvg, gravity: "center" }])
    .jpeg({ quality: 80 })
    .toFile(thumbPath);

  return `/uploads/${eventId}/thumbnails/${thumbFilename}`;
}

async function reprocessPhoto(photoId: string) {
  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    include: { event: { include: { startListEntries: true } } },
  });

  if (!photo) {
    console.error(`❌ Photo ${photoId} not found`);
    return;
  }

  console.log(`\n📸 Processing photo: ${photo.path}`);

  // Extract eventId from path: /uploads/{eventId}/{filename}
  const pathParts = photo.path.split("/");
  const eventId = pathParts[2];
  const filename = pathParts[3];
  const originalPath = path.join(UPLOAD_DIR, eventId, filename);

  // Check if file exists
  try {
    await fs.access(originalPath);
  } catch {
    console.error(`❌ File not found: ${originalPath}`);
    return;
  }

  try {
    // 1. Generate web version
    const webPath = await generateWebVersion(originalPath, eventId, filename);

    // 2. Generate watermarked thumbnail
    const thumbnailPath = await generateWatermarkedThumbnail(
      originalPath,
      eventId,
      filename
    );

    // 3. Run OCR on web version
    const webFilePath = path.join(
      UPLOAD_DIR,
      eventId,
      "web",
      `web_${path.parse(filename).name}.jpg`
    );

    const validBibs = new Set(
      photo.event.startListEntries.map((e) => e.bibNumber)
    );

    console.log(`  ✓ Running OCR (Tesseract)...`);
    const ocrResult = await extractBibNumbers(
      webFilePath,
      validBibs.size > 0 ? validBibs : undefined,
      "tesseract" // Force Tesseract since we're in free tier
    );

    console.log(
      `  ✓ OCR found ${ocrResult.bibNumbers.length} bib(s): ${ocrResult.bibNumbers.join(", ") || "none"}`
    );

    // 4. Update photo in DB
    await prisma.photo.update({
      where: { id: photoId },
      data: {
        webPath,
        thumbnailPath,
        ocrProvider: ocrResult.provider,
      },
    });

    // 5. Create/update bib numbers
    if (ocrResult.bibNumbers.length > 0) {
      await prisma.bibNumber.deleteMany({ where: { photoId } });

      for (const bibNum of ocrResult.bibNumbers) {
        await prisma.bibNumber.create({
          data: {
            photoId,
            number: bibNum,
            confidence: ocrResult.confidence,
            source: "ocr_tesseract",
          },
        });
      }
    }

    console.log(`✅ Successfully reprocessed photo ${photoId}`);
  } catch (error) {
    console.error(`❌ Error reprocessing photo ${photoId}:`, error);
  }
}

async function main() {
  console.log("🚀 Starting photo reprocessing...\n");

  // Get all photos without webPath (means they were uploaded before optimization)
  const photos = await prisma.photo.findMany({
    where: {
      OR: [{ webPath: null }, { thumbnailPath: null }],
    },
    orderBy: { createdAt: "desc" },
  });

  console.log(`Found ${photos.length} photos to reprocess\n`);

  for (let i = 0; i < photos.length; i++) {
    console.log(`\n[${i + 1}/${photos.length}]`);
    await reprocessPhoto(photos[i].id);
  }

  console.log("\n\n✅ All photos reprocessed!");
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
