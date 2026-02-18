import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { aiConfig } from "./ai-config";

let client: S3Client | null = null;

function getClient(): S3Client {
  if (!client) {
    client = new S3Client({
      region: aiConfig.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return client;
}

/**
 * Upload a file to S3.
 * Returns the S3 key.
 */
export async function uploadToS3(
  buffer: Buffer,
  key: string,
  contentType: string = "image/jpeg"
): Promise<string> {
  const s3 = getClient();

  await s3.send(
    new PutObjectCommand({
      Bucket: aiConfig.s3Bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return key;
}

/**
 * Get a file stream from S3.
 */
export async function getFromS3(key: string): Promise<ReadableStream | null> {
  const s3 = getClient();

  const response = await s3.send(
    new GetObjectCommand({
      Bucket: aiConfig.s3Bucket,
      Key: key,
    })
  );

  return response.Body?.transformToWebStream() || null;
}

/**
 * Get a file from S3 as Buffer (for image processing).
 */
export async function getFromS3AsBuffer(key: string): Promise<Buffer> {
  const s3 = getClient();

  const response = await s3.send(
    new GetObjectCommand({
      Bucket: aiConfig.s3Bucket,
      Key: key,
    })
  );

  const bytes = await response.Body?.transformToByteArray();
  if (!bytes) throw new Error(`S3 object empty: ${key}`);
  return Buffer.from(bytes);
}

/**
 * Get the content length of an S3 object.
 */
export async function getS3ObjectSize(key: string): Promise<number | null> {
  try {
    const s3 = getClient();
    const response = await s3.send(
      new HeadObjectCommand({
        Bucket: aiConfig.s3Bucket,
        Key: key,
      })
    );
    return response.ContentLength ?? null;
  } catch {
    return null;
  }
}

/**
 * Delete a file from S3.
 */
export async function deleteFromS3(key: string): Promise<void> {
  const s3 = getClient();

  await s3.send(
    new DeleteObjectCommand({
      Bucket: aiConfig.s3Bucket,
      Key: key,
    })
  );
}

/**
 * Delete multiple files from S3 in a single batch request.
 */
export async function deleteMultipleFromS3(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const s3 = getClient();

  // S3 DeleteObjects supports max 1000 keys per request
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000);
    await s3.send(
      new DeleteObjectsCommand({
        Bucket: aiConfig.s3Bucket,
        Delete: {
          Objects: batch.map((Key) => ({ Key })),
          Quiet: true,
        },
      })
    );
  }
}

/**
 * Generate a presigned URL for temporary download access.
 * Default: 24 hours expiry.
 */
export async function getSignedDownloadUrl(
  key: string,
  expiresInSeconds: number = 86400
): Promise<string> {
  const s3 = getClient();

  // If CloudFront is configured, use it instead
  if (aiConfig.cloudfrontUrl) {
    return `${aiConfig.cloudfrontUrl}/${key}`;
  }

  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: aiConfig.s3Bucket,
      Key: key,
    }),
    { expiresIn: expiresInSeconds }
  );

  return url;
}

/**
 * Generate S3 key from event ID and filename.
 */
export function getS3Key(
  eventId: string,
  filename: string,
  type: "original" | "thumbnail" | "branding" | "web" | "micro" | "crop" = "original"
): string {
  switch (type) {
    case "thumbnail":
      return `events/${eventId}/thumbs/${filename}`;
    case "micro":
      return `events/${eventId}/thumbs/${filename}`;
    case "web":
      return `events/${eventId}/web/${filename}`;
    case "crop":
      return `events/${eventId}/crops/${filename}`;
    case "branding":
      return `events/${eventId}/branding/${filename}`;
    default:
      return `events/${eventId}/originals/${filename}`;
  }
}

/**
 * Convert an S3 key to a public-facing path (for frontend URLs).
 * e.g. "events/{eventId}/thumbs/wm_xxx.webp" → "/uploads/{eventId}/thumbs/wm_xxx.webp"
 * Also handles "platform/watermark.png" → "/uploads/platform/watermark.png"
 */
export function s3KeyToPublicPath(s3Key: string): string {
  // S3 keys start with "events/" or "platform/"
  if (s3Key.startsWith("events/")) {
    return `/uploads/${s3Key.replace("events/", "")}`;
  }
  if (s3Key.startsWith("platform/")) {
    return `/uploads/${s3Key}`;
  }
  // Fallback: already a public path (starts with /uploads/)
  if (s3Key.startsWith("/uploads/")) {
    return s3Key;
  }
  return `/uploads/${s3Key}`;
}

/**
 * Convert a public-facing path to an S3 key.
 * e.g. "/uploads/{eventId}/thumbs/wm_xxx.webp" → "events/{eventId}/thumbs/wm_xxx.webp"
 * Also handles "/uploads/platform/watermark.png" → "platform/watermark.png"
 */
export function publicPathToS3Key(publicPath: string): string {
  // Strip leading /uploads/
  const stripped = publicPath.replace(/^\/uploads\//, "");
  // If it starts with "platform/", keep as-is
  if (stripped.startsWith("platform/")) {
    return stripped;
  }
  // Otherwise it's an event path: "{eventId}/..." → "events/{eventId}/..."
  return `events/${stripped}`;
}
