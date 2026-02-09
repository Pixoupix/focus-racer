import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { saveFile, getUploadedFilePath } from "@/lib/storage";
import { processPhotoOCR } from "@/lib/ocr";
import { generateWatermarkedThumbnail } from "@/lib/watermark";
import { analyzeQuality, autoEditImage } from "@/lib/image-processing";
import { aiConfig } from "@/lib/ai-config";
import { indexFaces, detectLabels } from "@/lib/rekognition";
import { scheduleAutoClustering } from "@/lib/auto-cluster";
import { processingQueue } from "@/lib/processing-queue";

/**
 * Process all AI tasks in the background after upload.
 * Uses the web-optimized version (< 4MB) for all AI tasks.
 * Steps: quality check → auto-edit → watermark → OCR → face index → labels
 */
async function processPhotoInBackground(
  photoId: string,
  webFilePath: string,
  originalFilePath: string,
  eventId: string,
  eventName: string
) {
  try {
    const webFullPath = await getUploadedFilePath(webFilePath);

    // 1. Quality analysis (on web version — fast, 1600px max)
    const quality = await analyzeQuality(webFullPath);
    console.log(`[AI] Photo ${photoId}: quality=${quality.score}, blurry=${quality.isBlurry}`);

    await prisma.photo.update({
      where: { id: photoId },
      data: {
        qualityScore: quality.score,
        isBlurry: quality.isBlurry,
      },
    });

    // 2. Auto-edit on web version (lightweight, no need to process 20MB originals)
    if (!quality.isBlurry && aiConfig.autoEditEnabled) {
      const wasEdited = await autoEditImage(webFullPath);
      if (wasEdited) {
        await prisma.photo.update({
          where: { id: photoId },
          data: { autoEdited: true },
        });
        console.log(`[AI] Photo ${photoId}: auto-edited`);
      }
    }

    // 3. Watermark thumbnail (from web version)
    try {
      const thumbnailPath = await generateWatermarkedThumbnail(
        eventId,
        webFilePath,
        eventName || "FOCUS RACER"
      );
      await prisma.photo.update({
        where: { id: photoId },
        data: { thumbnailPath },
      });
    } catch (err) {
      console.error(`[AI] Watermark error for photo ${photoId}:`, err);
    }

    // 4. OCR on web version (< 4MB, compatible with AWS 5MB limit)
    let validBibs: Set<string> | undefined;
    const startList = await prisma.startListEntry.findMany({
      where: { eventId },
      select: { bibNumber: true },
    });
    if (startList.length > 0) {
      validBibs = new Set(startList.map((s) => s.bibNumber));
    }

    const ocrResult = await processPhotoOCR(webFullPath, validBibs);
    console.log(
      `[AI] Photo ${photoId}: OCR found ${ocrResult.numbers.length} bibs via ${ocrResult.provider}`
    );

    if (ocrResult.numbers.length > 0) {
      await prisma.bibNumber.createMany({
        data: ocrResult.numbers.map((number) => ({
          number,
          photoId,
          confidence: ocrResult.confidence,
          source: ocrResult.provider,
        })),
      });
    }

    await prisma.photo.update({
      where: { id: photoId },
      data: {
        ocrProvider: ocrResult.provider,
        processedAt: new Date(),
      },
    });

    // 5. Face indexing on web version (< 4MB, AWS limit safe)
    if (aiConfig.faceIndexEnabled) {
      try {
        const faces = await indexFaces(webFullPath, `${eventId}:${photoId}`);
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

    // 6. Label detection on web version
    if (aiConfig.labelDetectionEnabled) {
      try {
        const labels = await detectLabels(webFullPath, 15, 60);
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

    // Save the file (HD original + web-optimized version)
    const { filename, path, webPath, s3Key } = await saveFile(file, eventId);

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

    // Enqueue AI processing (bounded concurrency, default 4 workers)
    processingQueue.enqueue(() =>
      processPhotoInBackground(photo.id, webPath, path, eventId, event.name)
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
