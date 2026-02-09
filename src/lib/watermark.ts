import sharp from "sharp";
import path from "path";
import fs from "fs/promises";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./public/uploads";

/**
 * Generate a watermarked thumbnail for public display.
 * Uses the web-optimized source (already resized) for fast processing.
 * The HD original is kept untouched for delivery after purchase.
 *
 * @param eventId - Event ID for output directory
 * @param sourcePath - Relative path to source image (e.g. /uploads/eventId/web/web_xxx.jpg)
 * @param watermarkText - Text to overlay
 */
export async function generateWatermarkedThumbnail(
  eventId: string,
  sourcePath: string,
  watermarkText: string = "FOCUS RACER"
): Promise<string> {
  const thumbDir = path.join(UPLOAD_DIR, eventId, "thumbs");
  await fs.mkdir(thumbDir, { recursive: true });

  // Resolve full path from relative path
  const fullSourcePath = path.join(process.cwd(), "public", sourcePath);

  const sourceBasename = path.parse(path.basename(sourcePath)).name;
  const thumbFilename = `wm_${sourceBasename}.jpg`;
  const thumbPath = path.join(thumbDir, thumbFilename);

  const image = sharp(fullSourcePath);
  const metadata = await image.metadata();
  const width = metadata.width || 800;
  const height = metadata.height || 600;

  // Create SVG watermark overlay with repeated diagonal text
  const fontSize = Math.max(Math.round(width / 20), 16);
  const lines: string[] = [];

  for (let y = -height; y < height * 2; y += fontSize * 3) {
    for (let x = -width; x < width * 2; x += fontSize * 8) {
      lines.push(
        `<text x="${x}" y="${y}" font-size="${fontSize}" fill="white" opacity="0.3" font-family="Arial, sans-serif" font-weight="bold" transform="rotate(-30, ${x}, ${y})">${watermarkText}</text>`
      );
    }
  }

  const svgOverlay = Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      ${lines.join("\n")}
    </svg>`
  );

  // Source is already web-optimized (max 1600px), resize to 1200px for thumbnail
  await sharp(fullSourcePath)
    .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
    .composite([
      {
        input: await sharp(svgOverlay)
          .resize(
            Math.min(width, 1200),
            Math.round(Math.min(width, 1200) * (height / width)),
            { fit: "fill" }
          )
          .png()
          .toBuffer(),
        gravity: "center",
      },
    ])
    .jpeg({ quality: 80 })
    .toFile(thumbPath);

  return `/uploads/${eventId}/thumbs/${thumbFilename}`;
}
