import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
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
  type: "original" | "thumbnail" | "branding" = "original"
): string {
  switch (type) {
    case "thumbnail":
      return `events/${eventId}/thumbs/${filename}`;
    case "branding":
      return `events/${eventId}/branding/${filename}`;
    default:
      return `events/${eventId}/originals/${filename}`;
  }
}
