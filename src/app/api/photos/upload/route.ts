import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { saveFile } from "@/lib/storage";
import { generateWatermarkedThumbnail } from "@/lib/watermark";
import { analyzeQuality, autoRetouchWebVersion } from "@/lib/image-processing";
import { aiConfig } from "@/lib/ai-config";
import { detectTextFromImage, indexFaces, detectLabels } from "@/lib/rekognition";
import { scheduleAutoClustering } from "@/lib/auto-cluster";
import { processingQueue } from "@/lib/processing-queue";

/**
 * Process all AI tasks in the background after upload.
 * Uses the JPEG buffer from web version for all AI tasks.
 * Steps: quality check → auto-retouch → watermark → OCR → face index → labels
 */
async function processPhotoInBackground(
  photoId: string,
  jpegBuffer: Buffer,
  webS3Key: string,
  eventId: string
) {
  try {
    // 1. Quality analysis (on JPEG buffer — fast, 1600px max)
    const quality = await analyzeQuality(jpegBuffer);
    console.log(`[AI] Photo ${photoId}: quality=${quality.score}, blurry=${quality.isBlurry}`);

    await prisma.photo.update({
      where: { id: photoId },
      data: {
        qualityScore: quality.score,
        isBlurry: quality.isBlurry,
      },
    });

    // 2. Auto-retouch on web version in S3
    if (!quality.isBlurry && aiConfig.autoEditEnabled) {
      const wasEdited = await autoRetouchWebVersion(webS3Key);
      if (wasEdited) {
        await prisma.photo.update({
          where: { id: photoId },
          data: { autoEdited: true },
        });
        console.log(`[AI] Photo ${photoId}: auto-retouched`);
      }
    }

    // 3. Watermark thumbnail (from JPEG buffer)
    try {
      const photo = await prisma.photo.findUnique({
        where: { id: photoId },
        select: { originalName: true },
      });
      const thumbnailPath = await generateWatermarkedThumbnail(
        eventId,
        jpegBuffer,
        photo?.originalName || "photo.jpg"
      );
      await prisma.photo.update({
        where: { id: photoId },
        data: { thumbnailPath },
      });
    } catch (err) {
      console.error(`[AI] Watermark error for photo ${photoId}:`, err);
    }

    // 4. OCR on JPEG buffer (< 4MB, compatible with AWS 5MB limit)
    let validBibs: Set<string> | undefined;
    const startList = await prisma.startListEntry.findMany({
      where: { eventId },
      select: { bibNumber: true },
    });
    if (startList.length > 0) {
      validBibs = new Set(startList.map((s) => s.bibNumber));
    }

    const ocrResult = await detectTextFromImage(jpegBuffer, validBibs);
    console.log(
      `[AI] Photo ${photoId}: OCR found ${ocrResult.bibNumbers.length} bibs`
    );

    if (ocrResult.bibNumbers.length > 0) {
      await prisma.bibNumber.createMany({
        data: ocrResult.bibNumbers.map((number: string) => ({
          number,
          photoId,
          confidence: ocrResult.confidence,
          source: "ocr_aws",
        })),
      });
    }

    await prisma.photo.update({
      where: { id: photoId },
      data: {
        ocrProvider: "ocr_aws",
        processedAt: new Date(),
      },
    });

    // 5. Face indexing on JPEG buffer (< 4MB, AWS limit safe)
    if (aiConfig.faceIndexEnabled) {
      try {
        const faces = await indexFaces(jpegBuffer, `${eventId}:${photoId}`);
        if (faces.length > 0) {
          await prisma.photoFace.createMany({
            data: faces.map((face) => ({
              photoId,
              faceId: face.faceId,
              confidence: face.confidence,
              boundingBox: JSON.stringify(face.boundingBox),
            })),
          });
          await prisma.photo.update({
            where: { id: photoId },
            data: { faceIndexed: true },
          });
          console.log(`[AI] Photo ${photoId}: indexed ${faces.length} face(s)`);
        }
      } catch (err) {
        console.error(`[AI] Face indexing error for photo ${photoId}:`, err);
      }
    }

    // 6. Label detection on JPEG buffer
    if (aiConfig.labelDetectionEnabled) {
      try {
        const labels = await detectLabels(jpegBuffer, 15, 60);
        if (labels.length > 0) {
          const labelStr = JSON.stringify(
            labels.map((l) => ({ name: l.name, confidence: Math.round(l.confidence) }))
          );
          await prisma.photo.update({
            where: { id: photoId },
            data: { labels: labelStr },
          });
          console.log(`[AI] Photo ${photoId}: detected ${labels.length} label(s)`);
        }
      } catch (err) {
        console.error(`[AI] Label detection error for photo ${photoId}:`, err);
      }
    }

    console.log(`[AI] Photo ${photoId}: all processing complete`);

    // Schedule auto-clustering (debounced: runs 30s after last processed photo)
    scheduleAutoClustering(eventId);
  } catch (error) {
    console.error(`[AI] Processing error for photo ${photoId}:`, error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const eventId = formData.get("eventId") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "Aucun fichier fourni" },
        { status: 400 }
      );
    }

    if (!eventId) {
      return NextResponse.json(
        { error: "ID d'événement manquant" },
        { status: 400 }
      );
    }

    // Verify event ownership
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Événement non trouvé" },
        { status: 404 }
      );
    }

    if (event.userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 403 }
      );
    }

    // Save the file (HD original + web-optimized version) to S3
    const { filename, path, webPath, jpegBuffer, s3Key } = await saveFile(file, eventId);

    // Create the photo record
    const photo = await prisma.photo.create({
      data: {
        filename,
        originalName: file.name,
        path,
        webPath,
        s3Key,
        eventId,
      },
    });

    // Enqueue AI processing (bounded concurrency)
    processingQueue.enqueue(() =>
      processPhotoInBackground(photo.id, jpegBuffer, webPath, eventId)
    );

    return NextResponse.json({
      success: true,
      photo: {
        id: photo.id,
        filename: photo.filename,
        path: photo.path,
      },
      bibNumbers: [],
      message: "Photo uploadée. L'analyse IA est en cours...",
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'upload" },
      { status: 500 }
    );
  }
}
