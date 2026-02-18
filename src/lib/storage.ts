import sharp from "./sharp-config";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { uploadToS3, deleteFromS3, deleteMultipleFromS3, getS3Key, s3KeyToPublicPath } from "./s3";

/** Max dimension for the web-optimized version (used by AI pipeline + display) */
const WEB_MAX_DIMENSION = 1600;
const WEB_JPEG_QUALITY = 80;

/**
 * Normalize problematic images (old JPEG formats, corrupted headers, etc.)
 * by converting them to a standard format first.
 * Accepts a file path OR a Buffer.
 */
export async function normalizeImage(input: string | Buffer): Promise<Buffer> {
  const strategies = [
    () => sharp(input, { failOnError: false })
      .jpeg({ quality: 95, force: true })
      .toBuffer(),

    () => sharp(input, { failOnError: false, unlimited: true })
      .toFormat("jpeg", { quality: 95 })
      .toBuffer(),

    () => sharp(input, { failOnError: false })
      .raw()
      .toBuffer({ resolveWithObject: true })
      .then(({ data, info }) =>
        sharp(data, {
          raw: {
            width: info.width,
            height: info.height,
            channels: info.channels
          }
        })
        .jpeg({ quality: 95 })
        .toBuffer()
      ),
  ];

  for (let i = 0; i < strategies.length; i++) {
    try {
      return await strategies[i]();
    } catch (error) {
      console.warn(`Normalization strategy ${i + 1} failed:`, error instanceof Error ? error.message : error);
      if (i === strategies.length - 1) {
        throw new Error(`Unable to normalize image after ${strategies.length} attempts`);
      }
    }
  }

  throw new Error("All normalization strategies failed");
}

/**
 * Generate a web-optimized version of the photo.
 * Uploads WebP to S3, returns S3 key + JPEG buffer for AI pipeline.
 */
async function generateWebVersion(
  originalBuffer: Buffer,
  eventId: string,
  filename: string
): Promise<{ webS3Key: string; jpegBuffer: Buffer }> {
  const webFilename = `web_${path.parse(filename).name}.webp`;
  const webS3Key = getS3Key(eventId, webFilename, "web");

  let jpegBuffer: Buffer;

  try {
    // Generate JPEG buffer for AI pipeline (AWS Rekognition requires JPEG/PNG)
    jpegBuffer = await sharp(originalBuffer)
      .resize(WEB_MAX_DIMENSION, WEB_MAX_DIMENSION, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: WEB_JPEG_QUALITY, mozjpeg: true })
      .toBuffer();

    // Convert to WebP for S3 storage (gallery display)
    const webpBuffer = await sharp(jpegBuffer)
      .webp({ quality: WEB_JPEG_QUALITY })
      .toBuffer();

    await uploadToS3(webpBuffer, webS3Key, "image/webp");
  } catch (standardError) {
    console.warn(`Standard processing failed for ${filename}:`, standardError instanceof Error ? standardError.message : standardError);
    console.warn(`Attempting normalization from buffer...`);

    try {
      const normalizedBuffer = await normalizeImage(originalBuffer);

      jpegBuffer = await sharp(normalizedBuffer)
        .resize(WEB_MAX_DIMENSION, WEB_MAX_DIMENSION, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: WEB_JPEG_QUALITY, mozjpeg: true })
        .toBuffer();

      const webpBuffer = await sharp(jpegBuffer)
        .webp({ quality: WEB_JPEG_QUALITY })
        .toBuffer();

      await uploadToS3(webpBuffer, webS3Key, "image/webp");

      console.log(`Successfully normalized and processed ${filename}`);
    } catch (normalizeError) {
      const errorMsg = normalizeError instanceof Error ? normalizeError.message : String(normalizeError);
      console.error(`Failed to normalize ${filename}:`, errorMsg);
      throw new Error(`Unable to process image: ${filename}. Error: ${errorMsg}`);
    }
  }

  return { webS3Key, jpegBuffer };
}

/**
 * Save a file to S3 (HD original + web-optimized version).
 * Returns S3 keys for both versions + JPEG buffer for AI pipeline.
 */
export async function saveFile(
  file: File,
  eventId: string
): Promise<{
  filename: string;
  path: string;
  webPath: string;
  jpegBuffer: Buffer;
  s3Key: string;
}> {
  const ext = path.extname(file.name);
  const filename = `${uuidv4()}${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  // Upload HD original to S3
  const contentType = file.type || "image/jpeg";
  const s3Key = getS3Key(eventId, filename, "original");
  await uploadToS3(buffer, s3Key, contentType);

  // Generate web-optimized version and upload to S3
  const { webS3Key, jpegBuffer } = await generateWebVersion(buffer, eventId, filename);

  return {
    filename,
    path: s3Key,
    webPath: webS3Key,
    jpegBuffer,
    s3Key,
  };
}

/**
 * Delete a photo and all its versions from S3.
 */
export async function deleteFile(s3Key: string): Promise<void> {
  // Collect all keys to delete
  const keysToDelete: string[] = [s3Key];

  // Derive web/thumb/micro keys from the original key
  const parts = s3Key.match(/^events\/([^/]+)\/originals\/(.+)$/);
  if (parts) {
    const [, eventId, filename] = parts;
    const basename = path.parse(filename).name;
    keysToDelete.push(
      getS3Key(eventId, `web_${basename}.webp`, "web"),
      getS3Key(eventId, `wm_${basename}.webp`, "thumbnail"),
      getS3Key(eventId, `micro_${basename}.webp`, "micro"),
    );
  }

  await deleteMultipleFromS3(keysToDelete);
}
