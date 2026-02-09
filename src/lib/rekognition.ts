import {
  RekognitionClient,
  DetectTextCommand,
  DetectLabelsCommand,
  IndexFacesCommand,
  SearchFacesByImageCommand,
  SearchFacesCommand,
  CreateCollectionCommand,
  ListCollectionsCommand,
} from "@aws-sdk/client-rekognition";
import { readFileSync } from "fs";
import { aiConfig } from "./ai-config";

let client: RekognitionClient | null = null;

function getClient(): RekognitionClient {
  if (!client) {
    client = new RekognitionClient({
      region: aiConfig.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return client;
}

// ---------- OCR via DetectText ----------

export interface RekognitionOCRResult {
  bibNumbers: string[];
  confidence: number;
  rawDetections: { text: string; confidence: number; type: string }[];
}

const BIB_NUMBER_REGEX = /\b\d{1,5}\b/g;

export async function detectTextFromImage(
  imagePath: string,
  validBibs?: Set<string>
): Promise<RekognitionOCRResult> {
  const imageBytes = readFileSync(imagePath);
  const rekognition = getClient();

  const response = await rekognition.send(
    new DetectTextCommand({
      Image: { Bytes: imageBytes },
    })
  );

  const detections = (response.TextDetections || []).map((d) => ({
    text: d.DetectedText || "",
    confidence: d.Confidence || 0,
    type: d.Type || "",
  }));

  // Extract all potential bib numbers from LINE detections (more reliable)
  const allText = detections
    .filter((d) => d.type === "LINE")
    .map((d) => d.text)
    .join(" ");

  const matches = allText.match(BIB_NUMBER_REGEX) || [];
  const avgConfidence =
    detections.length > 0
      ? detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length
      : 0;

  let bibNumbers = [...new Set(matches)].filter((num) => {
    const n = parseInt(num, 10);
    return n >= 1 && n <= 99999 && !(n >= 1900 && n <= 2100);
  });

  // If start-list provided, filter to only valid bibs
  if (validBibs && validBibs.size > 0) {
    const validated = bibNumbers.filter((b) => validBibs.has(b));
    // Keep at least the validated ones; if none match, keep all for manual review
    if (validated.length > 0) {
      bibNumbers = validated;
    }
  }

  return {
    bibNumbers: bibNumbers.sort((a, b) => parseInt(a, 10) - parseInt(b, 10)),
    confidence: avgConfidence,
    rawDetections: detections,
  };
}

// ---------- Label Detection ----------

export interface LabelResult {
  name: string;
  confidence: number;
  parents: string[];
}

export async function detectLabels(
  imagePath: string,
  maxLabels: number = 20,
  minConfidence: number = 70
): Promise<LabelResult[]> {
  const imageBytes = readFileSync(imagePath);
  const rekognition = getClient();

  const response = await rekognition.send(
    new DetectLabelsCommand({
      Image: { Bytes: imageBytes },
      MaxLabels: maxLabels,
      MinConfidence: minConfidence,
    })
  );

  return (response.Labels || []).map((label) => ({
    name: label.Name || "",
    confidence: label.Confidence || 0,
    parents: (label.Parents || []).map((p) => p.Name || ""),
  }));
}

// ---------- Face Indexing ----------

export async function ensureFaceCollection(): Promise<void> {
  const rekognition = getClient();
  const collectionId = aiConfig.faceCollectionId;

  try {
    const listResp = await rekognition.send(new ListCollectionsCommand({}));
    if (listResp.CollectionIds?.includes(collectionId)) return;

    await rekognition.send(
      new CreateCollectionCommand({ CollectionId: collectionId })
    );
    console.log(`Created Rekognition face collection: ${collectionId}`);
  } catch (err) {
    // Collection may already exist
    console.error("Face collection setup error:", err);
  }
}

export interface IndexedFace {
  faceId: string;
  confidence: number;
  boundingBox: { width: number; height: number; left: number; top: number };
}

export async function indexFaces(
  imagePath: string,
  externalImageId: string
): Promise<IndexedFace[]> {
  const imageBytes = readFileSync(imagePath);
  const rekognition = getClient();

  await ensureFaceCollection();

  const response = await rekognition.send(
    new IndexFacesCommand({
      CollectionId: aiConfig.faceCollectionId,
      Image: { Bytes: imageBytes },
      ExternalImageId: externalImageId,
      DetectionAttributes: ["DEFAULT"],
      MaxFaces: 10,
      QualityFilter: "AUTO",
    })
  );

  return (response.FaceRecords || []).map((record) => ({
    faceId: record.Face?.FaceId || "",
    confidence: record.Face?.Confidence || 0,
    boundingBox: {
      width: record.Face?.BoundingBox?.Width || 0,
      height: record.Face?.BoundingBox?.Height || 0,
      left: record.Face?.BoundingBox?.Left || 0,
      top: record.Face?.BoundingBox?.Top || 0,
    },
  }));
}

// ---------- Face Search by Selfie ----------

export interface FaceMatch {
  externalImageId: string;
  faceId: string;
  similarity: number;
}

export async function searchFaceByImage(
  imageBytes: Buffer,
  maxFaces: number = 20,
  threshold: number = 80
): Promise<FaceMatch[]> {
  const rekognition = getClient();

  await ensureFaceCollection();

  const response = await rekognition.send(
    new SearchFacesByImageCommand({
      CollectionId: aiConfig.faceCollectionId,
      Image: { Bytes: imageBytes },
      MaxFaces: maxFaces,
      FaceMatchThreshold: threshold,
    })
  );

  return (response.FaceMatches || []).map((match) => ({
    externalImageId: match.Face?.ExternalImageId || "",
    faceId: match.Face?.FaceId || "",
    similarity: match.Similarity || 0,
  }));
}

// ---------- Face Search by FaceId (for clustering) ----------

/**
 * Search for similar faces using an existing FaceId from the collection.
 * This is cheaper than SearchFacesByImage ($0.0004 vs $0.001).
 * Used for face clustering after indexing.
 */
export async function searchFacesByFaceId(
  faceId: string,
  maxFaces: number = 100,
  threshold: number = 85
): Promise<FaceMatch[]> {
  const rekognition = getClient();

  const response = await rekognition.send(
    new SearchFacesCommand({
      CollectionId: aiConfig.faceCollectionId,
      FaceId: faceId,
      MaxFaces: maxFaces,
      FaceMatchThreshold: threshold,
    })
  );

  return (response.FaceMatches || []).map((match) => ({
    externalImageId: match.Face?.ExternalImageId || "",
    faceId: match.Face?.FaceId || "",
    similarity: match.Similarity || 0,
  }));
}
