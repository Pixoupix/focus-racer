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

// In-memory store for live upload status per event
const liveStatus = new Map<string, {
  totalPhotos: number;
  processed: number;
  lastPhotoAt: string | null;
  isActive: boolean;
  recentPhotos: Array<{ id: string; filename: string; bibNumbers: string[]; timestamp: string }>;
}>();

function getOrCreateStatus(eventId: string) {
  if (!liveStatus.has(eventId)) {
    liveStatus.set(eventId, {
      totalPhotos: 0,
      processed: 0,
      lastPhotoAt: null,
      isActive: false,
      recentPhotos: [],
    });
  }
  return liveStatus.get(eventId)!;
}

// SSE listeners per event
const sseListeners = new Map<string, Set<(data: string) => void>>();

function notifyListeners(eventId: string, data: object) {
  const listeners = sseListeners.get(eventId);
  if (listeners) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    for (const listener of listeners) {
      listener(message);
    }
  }
}

async function processLivePhoto(
  photoId: string,
  jpegBuffer: Buffer,
  webS3Key: string,
  eventId: string
) {
  const status = getOrCreateStatus(eventId);

  try {
    // Quality analysis (on JPEG buffer)
    const quality = await analyzeQuality(jpegBuffer);
    await prisma.photo.update({
      where: { id: photoId },
      data: { qualityScore: quality.score, isBlurry: quality.isBlurry },
    });

    // Auto-retouch (on web version in S3)
    if (!quality.isBlurry && aiConfig.autoEditEnabled) {
      const wasEdited = await autoRetouchWebVersion(webS3Key);
      if (wasEdited) {
        await prisma.photo.update({
          where: { id: photoId },
          data: { autoEdited: true },
        });
      }
    }

    // Watermark thumbnail (from JPEG buffer)
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
    } catch {
      // Non-critical
    }

    // OCR (on JPEG buffer — < 4MB, AWS limit safe)
    let validBibs: Set<string> | undefined;
    const startList = await prisma.startListEntry.findMany({
      where: { eventId },
      select: { bibNumber: true },
    });
    if (startList.length > 0) {
      validBibs = new Set(startList.map((s) => s.bibNumber));
    }

    const ocrResult = await detectTextFromImage(jpegBuffer, validBibs);
    const detectedBibs: string[] = [];

    if (ocrResult.bibNumbers.length > 0) {
      await prisma.bibNumber.createMany({
        data: ocrResult.bibNumbers.map((number: string) => ({
          number,
          photoId,
          confidence: ocrResult.confidence,
          source: "ocr_aws",
        })),
      });
      detectedBibs.push(...ocrResult.bibNumbers);
    }

    await prisma.photo.update({
      where: { id: photoId },
      data: { ocrProvider: "ocr_aws", processedAt: new Date() },
    });

    // Face indexing (on JPEG buffer — < 4MB, AWS limit safe)
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
        }
      } catch {
        // Non-critical
      }
    }

    // Label detection (on JPEG buffer)
    if (aiConfig.labelDetectionEnabled) {
      try {
        const labels = await detectLabels(jpegBuffer, 15, 60);
        if (labels.length > 0) {
          await prisma.photo.update({
            where: { id: photoId },
            data: {
              labels: JSON.stringify(
                labels.map((l) => ({ name: l.name, confidence: Math.round(l.confidence) }))
              ),
            },
          });
        }
      } catch {
        // Non-critical
      }
    }

    // Update live status
    status.processed++;
    const recentEntry = {
      id: photoId,
      filename: webS3Key.split("/").pop() || "",
      bibNumbers: detectedBibs,
      timestamp: new Date().toISOString(),
    };
    status.recentPhotos.unshift(recentEntry);
    if (status.recentPhotos.length > 20) {
      status.recentPhotos = status.recentPhotos.slice(0, 20);
    }

    // Notify SSE listeners
    notifyListeners(eventId, {
      type: "photo_processed",
      photo: recentEntry,
      stats: {
        totalPhotos: status.totalPhotos,
        processed: status.processed,
      },
    });

    // Schedule auto-clustering (debounced: runs 30s after last processed photo)
    scheduleAutoClustering(eventId);
  } catch (error) {
    console.error(`[Live] Processing error for photo ${photoId}:`, error);
    notifyListeners(eventId, {
      type: "photo_error",
      photoId,
      error: "Erreur de traitement",
    });
  }
}

// POST: Upload a photo in live mode
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id: eventId } = params;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json({ error: "Événement non trouvé" }, { status: 404 });
    }

    if (event.userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    const { filename, path, webPath, jpegBuffer, s3Key } = await saveFile(file, eventId);

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

    // Update live status
    const status = getOrCreateStatus(eventId);
    status.totalPhotos++;
    status.lastPhotoAt = new Date().toISOString();
    status.isActive = true;

    // Notify SSE listeners of new photo
    notifyListeners(eventId, {
      type: "photo_received",
      photoId: photo.id,
      filename: file.name,
      stats: {
        totalPhotos: status.totalPhotos,
        processed: status.processed,
      },
    });

    // Enqueue AI processing (bounded concurrency)
    processingQueue.enqueue(() =>
      processLivePhoto(photo.id, jpegBuffer, webPath, eventId)
    );

    return NextResponse.json({
      success: true,
      photoId: photo.id,
      stats: {
        totalPhotos: status.totalPhotos,
        processed: status.processed,
      },
    });
  } catch (error) {
    console.error("Live upload error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'upload" },
      { status: 500 }
    );
  }
}

// GET: SSE stream for live status
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id: eventId } = params;

  const status = getOrCreateStatus(eventId);

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial status
      const initialData = `data: ${JSON.stringify({
        type: "init",
        stats: {
          totalPhotos: status.totalPhotos,
          processed: status.processed,
          isActive: status.isActive,
        },
        recentPhotos: status.recentPhotos,
      })}\n\n`;
      controller.enqueue(encoder.encode(initialData));

      // Register listener
      const listener = (message: string) => {
        try {
          controller.enqueue(encoder.encode(message));
        } catch {
          // Stream closed
        }
      };

      if (!sseListeners.has(eventId)) {
        sseListeners.set(eventId, new Set());
      }
      sseListeners.get(eventId)!.add(listener);

      // Heartbeat every 30s
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);

      // Cleanup on close
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        sseListeners.get(eventId)?.delete(listener);
        if (sseListeners.get(eventId)?.size === 0) {
          sseListeners.delete(eventId);
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
