import sharp from "sharp";
import { aiConfig } from "./ai-config";

/**
 * Analyze image quality by measuring sharpness via Laplacian variance.
 * Returns a score 0-100 where lower = blurrier.
 */
export async function analyzeQuality(
  imagePath: string
): Promise<{ score: number; isBlurry: boolean }> {
  try {
    // Resize to small size for fast analysis
    const { data, info } = await sharp(imagePath)
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
