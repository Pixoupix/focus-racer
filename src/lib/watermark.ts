import sharp from "@/lib/sharp-config";
import prisma from "@/lib/prisma";
import { uploadToS3, getS3Key, getFromS3AsBuffer, publicPathToS3Key } from "./s3";

// --- Custom watermark cache ---
let cachedCustomWatermark: undefined | null | { buffer: Buffer; opacity: number } = undefined;

export function invalidateWatermarkCache() {
  cachedCustomWatermark = undefined;
}

async function getCustomWatermark(): Promise<{ buffer: Buffer; opacity: number } | null> {
  if (cachedCustomWatermark !== undefined) return cachedCustomWatermark;

  try {
    const settings = await prisma.platformSettings.findUnique({
      where: { id: "default" },
    });

    if (!settings?.watermarkPath) {
      cachedCustomWatermark = null;
      return null;
    }

    // Read watermark from S3
    const s3Key = publicPathToS3Key(settings.watermarkPath);
    const buffer = await getFromS3AsBuffer(s3Key);
    cachedCustomWatermark = { buffer, opacity: settings.watermarkOpacity };
    return cachedCustomWatermark;
  } catch {
    cachedCustomWatermark = null;
    return null;
  }
}

// --- SVG watermark cache by dimensions ---
const svgCache = new Map<string, Buffer>();

function getCachedWatermarkSvg(width: number, height: number, thumbWidth: number, thumbHeight: number): Promise<Buffer> {
  const key = `${thumbWidth}x${thumbHeight}`;
  const cached = svgCache.get(key);
  if (cached) return Promise.resolve(cached);

  const fontSize = Math.max(Math.round(width / 20), 16);
  const watermarkText = "FOCUS RACER";
  const lines: string[] = [];

  for (let y = -height; y < height * 2; y += fontSize * 3) {
    for (let x = -width; x < width * 2; x += fontSize * 8) {
      lines.push(
        `<text x="${x}" y="${y}" font-size="${fontSize}" fill="white" opacity="0.3" font-family="Arial, sans-serif" font-weight="bold" transform="rotate(-30, ${x}, ${y})">${watermarkText}</text>`
      );
    }
  }

  const svgBuffer = Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${lines.join("")}</svg>`
  );

  return sharp(svgBuffer)
    .resize(thumbWidth, thumbHeight, { fit: "fill" })
    .png()
    .toBuffer()
    .then((buf) => {
      // Keep cache bounded (max 20 entries — typically 2-3 camera formats)
      if (svgCache.size >= 20) svgCache.clear();
      svgCache.set(key, buf);
      return buf;
    });
}

/**
 * Generate a watermarked thumbnail for public display.
 * Also generates a micro-thumbnail (400px) for dense admin grids.
 * Uploads both to S3, returns the S3 key of the thumbnail.
 */
export async function generateWatermarkedThumbnail(
  eventId: string,
  imageBuffer: Buffer,
  sourceFilename: string
): Promise<string> {
  const sourceBasename = (sourceFilename.includes("/") ? sourceFilename.split("/").pop()! : sourceFilename).replace(/\.[^.]+$/, "");
  const thumbFilename = `wm_${sourceBasename}.webp`;
  const microFilename = `micro_${sourceBasename}.webp`;
  const thumbS3Key = getS3Key(eventId, thumbFilename, "thumbnail");
  const microS3Key = getS3Key(eventId, microFilename, "micro");

  // Get image dimensions from buffer metadata (single decode)
  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width || 800;
  const height = metadata.height || 600;

  const thumbWidth = Math.min(width, 1200);
  const thumbHeight = Math.round(thumbWidth * (height / width));

  const customWm = await getCustomWatermark();

  let overlayBuffer: Buffer;

  if (customWm) {
    overlayBuffer = await sharp(customWm.buffer)
      .resize(thumbWidth, thumbHeight, { fit: "cover" })
      .ensureAlpha()
      .composite([{
        input: Buffer.from([255, 255, 255, Math.round(customWm.opacity * 255)]),
        raw: { width: 1, height: 1, channels: 4 },
        tile: true,
        blend: "dest-in",
      }])
      .png()
      .toBuffer();
  } else {
    overlayBuffer = await getCachedWatermarkSvg(width, height, thumbWidth, thumbHeight);
  }

  // Generate 1200px thumbnail
  const thumbBuffer = await sharp(imageBuffer)
    .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
    .composite([{ input: overlayBuffer, gravity: "center" }])
    .webp({ quality: 75 })
    .toBuffer();

  // Generate 400px micro-thumbnail from the already-composited thumbnail buffer
  const microBuffer = await sharp(thumbBuffer)
    .resize(400, 400, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 60 })
    .toBuffer();

  // Upload both to S3 in parallel
  await Promise.all([
    uploadToS3(thumbBuffer, thumbS3Key, "image/webp"),
    uploadToS3(microBuffer, microS3Key, "image/webp"),
  ]);

  return thumbS3Key;
}
