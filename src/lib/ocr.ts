import Tesseract from "tesseract.js";
import { OCRResult } from "@/types";
import { aiConfig } from "./ai-config";
import { detectTextFromImage } from "./rekognition";

const BIB_NUMBER_REGEX = /\b\d{1,5}\b/g;

/**
 * Extract bib numbers from image.
 *
 * - AWS configured → Rekognition only (~0.3s, high accuracy)
 * - AWS not configured → Tesseract fallback (dev/local only)
 */
export async function extractBibNumbers(
  imagePath: string,
  validBibs?: Set<string>
): Promise<OCRResult & { provider: string }> {
  if (aiConfig.awsEnabled) {
    return extractWithRekognition(imagePath, validBibs);
  }
  return extractWithTesseract(imagePath, validBibs);
}

// --- AWS Rekognition (production) ---

async function extractWithRekognition(
  imagePath: string,
  validBibs?: Set<string>
): Promise<OCRResult & { provider: string }> {
  console.log(`[OCR] AWS Rekognition on: ${imagePath}`);
  const result = await detectTextFromImage(imagePath, validBibs);
  console.log(`[OCR] Rekognition found ${result.bibNumbers.length} bibs (confidence: ${result.confidence.toFixed(1)}%)`);

  return {
    bibNumbers: result.bibNumbers,
    confidence: result.confidence,
    rawText: result.rawDetections.map((d) => d.text).join(" "),
    provider: "ocr_aws",
  };
}

// --- Tesseract.js (dev/local fallback when AWS not configured) ---

async function extractWithTesseract(
  imagePath: string,
  validBibs?: Set<string>
): Promise<OCRResult & { provider: string }> {
  try {
    console.log(`[OCR] Tesseract (no AWS) on: ${imagePath}`);

    const result = await Tesseract.recognize(imagePath, "eng", {
      logger: (m) => {
        if (m.status === "recognizing text") {
          const pct = Math.round(m.progress * 100);
          if (pct % 25 === 0) {
            console.log(`[OCR] Tesseract progress: ${pct}%`);
          }
        }
      },
    });

    const rawText = result.data.text;
    const confidence = result.data.confidence;

    const matches = rawText.match(BIB_NUMBER_REGEX) || [];

    let bibNumbers = [...new Set(matches)].filter((num) => {
      const n = parseInt(num, 10);
      return n >= 1 && n <= 99999 && !(n >= 1900 && n <= 2100);
    });

    if (validBibs && validBibs.size > 0) {
      const validated = bibNumbers.filter((b) => validBibs.has(b));
      if (validated.length > 0) bibNumbers = validated;
    }

    bibNumbers.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    console.log(`[OCR] Tesseract found: ${bibNumbers.join(", ") || "none"} (confidence: ${confidence.toFixed(1)}%)`);

    return {
      bibNumbers,
      confidence,
      rawText,
      provider: "ocr_tesseract",
    };
  } catch (error) {
    console.error("[OCR] Tesseract error:", error);
    return {
      bibNumbers: [],
      confidence: 0,
      rawText: "",
      provider: "ocr_tesseract",
    };
  }
}

/**
 * Process photo OCR (backward-compatible wrapper).
 */
export async function processPhotoOCR(
  imagePath: string,
  validBibs?: Set<string>
): Promise<{ numbers: string[]; confidence: number; provider: string }> {
  const result = await extractBibNumbers(imagePath, validBibs);
  return {
    numbers: result.bibNumbers,
    confidence: result.confidence,
    provider: result.provider,
  };
}
