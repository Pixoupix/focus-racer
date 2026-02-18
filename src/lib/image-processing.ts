import sharp from "./sharp-config";
import { aiConfig } from "./ai-config";
import { getFromS3AsBuffer, uploadToS3, getS3Key } from "./s3";

/**
 * Analyze image quality by measuring sharpness via Laplacian variance.
 * Returns a score 0-100 where lower = blurrier.
 */
export async function analyzeQuality(
  imageInput: string | Buffer
): Promise<{ score: number; isBlurry: boolean }> {
  try {
    // Resize to small size for fast analysis
    const { data, info } = await sharp(imageInput)
      .resize(256, 256, { fit: "inside" })
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Calculate Laplacian variance (edge detection = sharpness indicator)
    const width = info.width;
    const height = info.height;
    let sumLaplacian = 0;
    let count = 0;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        // Laplacian kernel: [0,1,0],[1,-4,1],[0,1,0]
        const lap =
          data[(y - 1) * width + x] +
          data[y * width + (x - 1)] +
          data[y * width + (x + 1)] +
          data[(y + 1) * width + x] -
          4 * data[idx];
        sumLaplacian += lap * lap;
        count++;
      }
    }

    const variance = count > 0 ? sumLaplacian / count : 0;
    // Normalize to 0-100 range (empirical: variance >500 = sharp, <100 = blurry)
    const score = Math.min(100, Math.round((variance / 500) * 100));
    const isBlurry = score < aiConfig.qualityThreshold;

    return { score, isBlurry };
  } catch (error) {
    console.error("Quality analysis error:", error);
    return { score: 50, isBlurry: false }; // Default to acceptable on error
  }
}

/**
 * Auto-retouch applied to the web version stored in S3.
 * Reads from S3, processes, re-uploads to the same key.
 * @param webS3Key - S3 key like "events/{eventId}/web/web_xxx.webp"
 */
export async function autoRetouchWebVersion(webS3Key: string): Promise<boolean> {
  try {
    const webBuffer = await getFromS3AsBuffer(webS3Key);

    const retouchedBuffer = await sharp(webBuffer)
      .normalize()
      .modulate({
        brightness: 1.02,
        saturation: 1.05,
      })
      .sharpen({ sigma: 0.8, m1: 1.0, m2: 0.5 })
      .webp({ quality: 80 })
      .toBuffer();

    await uploadToS3(retouchedBuffer, webS3Key, "image/webp");
    return true;
  } catch (error) {
    console.error("[AutoRetouch] Error:", error);
    return false;
  }
}

/**
 * Smart Crop: generate an individual crop for each detected face.
 * Uses bounding box from Rekognition (relative 0-1 coordinates).
 * Uploads crop to S3, returns the S3 key.
 */
export async function smartCropFace(
  jpegBuffer: Buffer,
  eventId: string,
  photoId: string,
  faceIndex: number,
  boundingBox: { left: number; top: number; width: number; height: number }
): Promise<string | null> {
  try {
    const metadata = await sharp(jpegBuffer).metadata();
    if (!metadata.width || !metadata.height) return null;

    const imgW = metadata.width;
    const imgH = metadata.height;

    // Convert relative coords to absolute pixels
    const faceX = Math.round(boundingBox.left * imgW);
    const faceY = Math.round(boundingBox.top * imgH);
    const faceW = Math.round(boundingBox.width * imgW);
    const faceH = Math.round(boundingBox.height * imgH);

    // Add generous padding: 80% on sides, 50% above (hair/cap), 200% below (upper body + bib)
    const padLeft = Math.round(faceW * 0.8);
    const padRight = Math.round(faceW * 0.8);
    const padTop = Math.round(faceH * 0.5);
    const padBottom = Math.round(faceH * 2.0);

    // Calculate crop region clamped to image bounds
    const cropLeft = Math.max(0, faceX - padLeft);
    const cropTop = Math.max(0, faceY - padTop);
    const cropRight = Math.min(imgW, faceX + faceW + padRight);
    const cropBottom = Math.min(imgH, faceY + faceH + padBottom);
    const cropW = cropRight - cropLeft;
    const cropH = cropBottom - cropTop;

    if (cropW < 50 || cropH < 50) return null;

    const cropFilename = `${photoId}_face${faceIndex}.webp`;
    const cropS3Key = getS3Key(eventId, cropFilename, "crop");

    const cropBuffer = await sharp(jpegBuffer)
      .extract({ left: cropLeft, top: cropTop, width: cropW, height: cropH })
      .resize(800, 800, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    await uploadToS3(cropBuffer, cropS3Key, "image/webp");

    return cropS3Key;
  } catch (error) {
    console.error(`[SmartCrop] Error for photo ${photoId} face ${faceIndex}:`, error);
    return null;
  }
}

/**
 * Compute a perceptual hash (pHash) for duplicate detection.
 * Resizes to 8x8 grayscale, compares each pixel to the average.
 * Returns a 64-character binary string ("0" and "1").
 */
export async function computePerceptualHash(jpegBuffer: Buffer): Promise<string> {
  const { data } = await sharp(jpegBuffer)
    .resize(8, 8, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Compute average
  let sum = 0;
  for (let i = 0; i < 64; i++) sum += data[i];
  const avg = sum / 64;

  // Build hash: 1 if pixel >= average, 0 otherwise
  let hash = "";
  for (let i = 0; i < 64; i++) {
    hash += data[i] >= avg ? "1" : "0";
  }
  return hash;
}

/**
 * Compute hamming distance between two pHash strings.
 */
function hammingDistance(a: string, b: string): number {
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) dist++;
  }
  return dist;
}

/**
 * Find duplicate photos from a list of buffers using perceptual hashing.
 * Returns indices of photos to KEEP (first in each group = best kept).
 * Threshold: hamming distance <= 5 out of 64 = ~92% similar.
 */
export async function findDuplicateIndices(
  jpegBuffers: Buffer[]
): Promise<{ keepIndices: Set<number>; duplicateCount: number }> {
  if (jpegBuffers.length <= 1) {
    return { keepIndices: new Set(jpegBuffers.map((_, i) => i)), duplicateCount: 0 };
  }

  const THRESHOLD = 5; // hamming distance <= 5 = duplicate
  const hashes: string[] = [];

  // Compute all hashes
  for (const buf of jpegBuffers) {
    try {
      const hash = await computePerceptualHash(buf);
      hashes.push(hash);
    } catch {
      hashes.push(""); // Empty hash = never matches = always kept
    }
  }

  // Mark duplicates (keep first occurrence in each group)
  const isDuplicate = new Set<number>();

  for (let i = 0; i < hashes.length; i++) {
    if (isDuplicate.has(i) || !hashes[i]) continue;
    for (let j = i + 1; j < hashes.length; j++) {
      if (isDuplicate.has(j) || !hashes[j]) continue;
      if (hammingDistance(hashes[i], hashes[j]) <= THRESHOLD) {
        isDuplicate.add(j);
      }
    }
  }

  const keepIndices = new Set<number>();
  for (let i = 0; i < hashes.length; i++) {
    if (!isDuplicate.has(i)) keepIndices.add(i);
  }

  return { keepIndices, duplicateCount: isDuplicate.size };
}
