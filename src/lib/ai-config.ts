/**
 * AI processing configuration.
 * All thresholds and feature flags are environment-driven.
 */

export const aiConfig = {
  /** Is AWS configured? */
  get awsEnabled(): boolean {
    return !!(
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.AWS_REGION
    );
  },

  /** Minimum OCR confidence to auto-accept (0-100) */
  get ocrConfidenceThreshold(): number {
    return parseInt(process.env.AI_OCR_CONFIDENCE_THRESHOLD || "70", 10);
  },

  /** Minimum quality score to pass (0-100, lower = blurrier) */
  get qualityThreshold(): number {
    return parseInt(process.env.AI_QUALITY_THRESHOLD || "30", 10);
  },

  /** Auto-edit images on upload */
  get autoEditEnabled(): boolean {
    return process.env.AI_AUTO_EDIT_ENABLED !== "false";
  },

  /** Index faces in Rekognition on upload */
  get faceIndexEnabled(): boolean {
    return this.awsEnabled && process.env.AI_FACE_INDEX_ENABLED !== "false";
  },

  /** Detect labels (clothing, accessories) */
  get labelDetectionEnabled(): boolean {
    return this.awsEnabled && process.env.AI_LABEL_DETECTION_ENABLED !== "false";
  },

  /** S3 bucket for storage (empty = use local) */
  get s3Bucket(): string {
    return process.env.AWS_S3_BUCKET || "";
  },

  /** Is S3 storage active? */
  get s3Enabled(): boolean {
    return this.awsEnabled && !!this.s3Bucket;
  },

  /** CloudFront URL for CDN delivery */
  get cloudfrontUrl(): string {
    return process.env.AWS_CLOUDFRONT_URL || "";
  },

  /** AWS region */
  get region(): string {
    return process.env.AWS_REGION || "eu-west-1";
  },

  /** Rekognition face collection ID */
  get faceCollectionId(): string {
    return process.env.AWS_REKOGNITION_COLLECTION_ID || "focusracer-faces";
  },
};
