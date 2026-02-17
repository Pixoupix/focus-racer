import sharp from "./sharp-config";
import fs from "fs/promises";
import path from "path";
import { aiConfig } from "./ai-config";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./public/uploads";

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
 * Auto-edit an image: normalize exposure, adjust contrast, sharpen.
 * Saves the edited version alongside the original.
 */
export async function autoEditImage(imagePath: string): Promise<boolean> {
  if (!aiConfig.autoEditEnabled) return false;

  try {
    const metadata = await sharp(imagePath).metadata();
    if (!metadata.width || !metadata.height) return false;

    // Apply auto-corrections in-place
    await sharp(imagePath)
      .normalize() // Auto-stretch contrast/brightness
      .modulate({
        brightness: 1.02, // Slight brightness boost (common for outdoor sports)
        saturation: 1.05, // Slight saturation boost
      })
      .sharpen({
        sigma: 0.8, // Gentle sharpening
        m1: 1.0,
        m2: 0.5,
      })
      .toBuffer()
      .then((buffer) => sharp(buffer).toFile(imagePath));

    return true;
  } catch (error) {
    console.error("Auto-edit error:", error);
    return false;
  }
}

/**
 * Auto-retouch applied to the web version file on disk.
 * Normalizes exposure, boosts brightness/saturation, sharpens.
 * Overwrites the webPath file in-place.
 * @param webPath - relative path like "/uploads/{eventId}/web/filename.webp"
 */
export async function autoRetouchWebVersion(webPath: string): Promise<boolean> {
  try {
    // webPath is "/uploads/..." which maps to "./public/uploads/..."
    const resolvedPath = path.resolve("./public", webPath.replace(/^\//, ""));

    const buffer = await sharp(resolvedPath)
      .normalize()
      .modulate({
        brightness: 1.02,
        saturation: 1.05,
      })
      .sharpen({ sigma: 0.8, m1: 1.0, m2: 0.5 })
      .webp({ quality: 80 })
      .toBuffer();

    await fs.writeFile(resolvedPath, buffer);
    return true;
  } catch (error) {
    console.error("[AutoRetouch] Error:", error);
    return false;
  }
}

/**
 * Smart Crop: generate an individual crop for each detected face.
 * Uses bounding box from Rekognition (relative 0-1 coordinates).
 * Adds generous padding around the face for context (upper body + race context).
 * Returns the relative path to the saved crop file.
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

    // Crop and save as WebP
    const cropsDir = path.join(UPLOAD_DIR, eventId, "crops");
    await fs.mkdir(cropsDir, { recursive: true });

    const cropFilename = `${photoId}_face${faceIndex}.webp`;
    const cropFullPath = path.join(cropsDir, cropFilename);

    await sharp(jpegBuffer)
      .extract({ left: cropLeft, top: cropTop, width: cropW, height: cropH })
      .resize(800, 800, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer()
      .then((buf) => fs.writeFile(cropFullPath, buf));

    // Return relative path (for DB storage and serving)
    return `/uploads/${eventId}/crops/${cropFilename}`;
  } catch (error) {
    console.error(`[SmartCrop] Error for photo ${photoId} face ${faceIndex}:`, error);
    return null;
  }
}
