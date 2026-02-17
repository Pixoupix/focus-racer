import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { saveFile } from "@/lib/storage";
import { generateWatermarkedThumbnail } from "@/lib/watermark";
import { analyzeQuality, autoRetouchWebVersion, smartCropFace } from "@/lib/image-processing";
import { aiConfig } from "@/lib/ai-config";
import { detectTextFromImage, indexFaces, searchFaceByImage } from "@/lib/rekognition";
import { scheduleAutoClustering } from "@/lib/auto-cluster";
import { processingQueue } from "@/lib/processing-queue";
import {
  createUploadSession,
  updateUploadProgress,
} from "@/lib/upload-session";
import "@/lib/sharp-config";

// Max execution time for large batch uploads (10 minutes)
export const maxDuration = 600;

async function processPhotoWithProgress(
  photoId: string,
  jpegBuffer: Buffer,
  originalFilename: string,
  eventId: string,
  sessionId: string,
  photoIndex: number,
  totalPhotos: number,
  processingMode: "lite" | "premium",
  creditsPerPhoto: number,
  validBibs: Set<string> | undefined,
  options: { autoRetouch: boolean; smartCrop: boolean },
  webPath: string | null
) {
  try {
    const label = `${photoIndex + 1}/${totalPhotos}`;

    // Collect all data for single batch update
    const photoData: {
      processedAt: Date;
      qualityScore?: number;
      isBlurry?: boolean;
      thumbnailPath?: string;
      ocrProvider?: string;
      faceIndexed?: boolean;
      autoEdited?: boolean;
    } = {
      processedAt: new Date(),
    };

    updateUploadProgress(sessionId, {
      currentStep: `Traitement photo ${label}`,
    });

    // All 4 operations are independent: they read jpegBuffer (JPEG for AWS compatibility)
    // and write to different outputs. Run them in parallel for ~27% speedup.
    const [quality, thumbnailPath, ocrResult, faces] = await Promise.all([
      analyzeQuality(jpegBuffer),
      generateWatermarkedThumbnail(eventId, jpegBuffer, originalFilename)
        .catch((err) => { console.error(`[Batch] Watermark error for ${photoId}:`, err); return null; }),
      detectTextFromImage(jpegBuffer, validBibs),
      (processingMode === "premium" && aiConfig.faceIndexEnabled)
        ? indexFaces(jpegBuffer, `${eventId}:${photoId}`).catch((err) => {
            console.error(`[Batch] Face indexing error for ${photoId}:`, err);
            return [] as Array<{ faceId: string; confidence: number; boundingBox: unknown }>;
          })
        : Promise.resolve(undefined),
    ]);

    photoData.qualityScore = quality.score;
    photoData.isBlurry = quality.isBlurry;
    if (thumbnailPath) {
      photoData.thumbnailPath = thumbnailPath;
    }

    // Process OCR results
    photoData.ocrProvider = "ocr_aws";

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

    // Process face indexing results (premium only)
    if (faces && faces.length > 0) {
      await prisma.photoFace.createMany({
        data: faces.map((face) => ({
          photoId,
          faceId: face.faceId,
          confidence: face.confidence,
          boundingBox: JSON.stringify(face.boundingBox),
        })),
      });
      photoData.faceIndexed = true;

      // Smart Crop: generate individual crop per face (free, Sharp local)
      if (options.smartCrop) {
        const createdFaces = await prisma.photoFace.findMany({
          where: { photoId },
          select: { id: true, boundingBox: true },
        });

        for (let fi = 0; fi < createdFaces.length; fi++) {
          const face = createdFaces[fi];
          if (!face.boundingBox) continue;
          try {
            const bbox = JSON.parse(face.boundingBox);
            const cropPath = await smartCropFace(jpegBuffer, eventId, photoId, fi, bbox);
            if (cropPath) {
              await prisma.photoFace.update({
                where: { id: face.id },
                data: { cropPath },
              });
            }
          } catch (cropErr) {
            console.error(`[Batch] Smart crop error for face ${fi}:`, cropErr);
          }
        }
      }
    }

    // Auto-retouch: apply to web version (free, Sharp local)
    if (options.autoRetouch && webPath) {
      try {
        const retouched = await autoRetouchWebVersion(webPath);
        if (retouched) {
          photoData.autoEdited = true;
        }
      } catch (retouchErr) {
        console.error(`[Batch] Auto-retouch error for ${photoId}:`, retouchErr);
      }
    }

    // 4. Single batch update to Photo
    await prisma.photo.update({
      where: { id: photoId },
      data: photoData,
    });

    // 5. Auto-link orphan photos by face recognition (Premium only)
    let bibsFoundByFace = 0;
    if (ocrResult.bibNumbers.length === 0 && processingMode === "premium" && faces && faces.length > 0) {
      updateUploadProgress(sessionId, {
        currentStep: `Recherche visages ${label}`,
      });

      try {
        // Search for matching faces in the collection
        const faceMatches = await searchFaceByImage(jpegBuffer, 10, 85);

        if (faceMatches.length > 0) {
          // Extract photoIds from externalImageId (format: "eventId:photoId")
          const matchedPhotoIds = faceMatches
            .map((match) => {
              const parts = match.externalImageId.split(":");
              return parts.length === 2 ? parts[1] : null;
            })
            .filter((id): id is string => id !== null);

          if (matchedPhotoIds.length > 0) {
            // Find bib numbers from matched photos
            const matchedBibs = await prisma.bibNumber.findMany({
              where: {
                photoId: { in: matchedPhotoIds },
              },
              select: { number: true },
              distinct: ["number"],
            });

            // Auto-assign bib numbers to the orphan photo
            if (matchedBibs.length > 0) {
              await prisma.bibNumber.createMany({
                data: matchedBibs.map((bib) => ({
                  number: bib.number,
                  photoId,
                  confidence: 95, // High confidence from face match
                  source: "face_recognition",
                })),
              });

              bibsFoundByFace = matchedBibs.length;
              console.log(`[Batch] Auto-linked ${bibsFoundByFace} bib(s) to photo ${photoId} via face recognition`);
            }
          }
        }
      } catch (err) {
        console.error(`[Batch] Face search error for ${photoId}:`, err);
      }
    }

    // 6. Refund credit if no bib detected (neither OCR nor face recognition)
    if (ocrResult.bibNumbers.length === 0 && bibsFoundByFace === 0) {
      const photo = await prisma.photo.findUnique({
        where: { id: photoId },
        select: { creditDeducted: true, creditRefunded: true },
      });

      if (photo && photo.creditDeducted && !photo.creditRefunded) {
        const event = await prisma.event.findUnique({
          where: { id: eventId },
          select: { userId: true },
        });

        if (event) {
          await prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({
              where: { id: event.userId },
              select: { credits: true },
            });
            if (!user) return;

            const balanceBefore = user.credits;
            const balanceAfter = balanceBefore + creditsPerPhoto;

            await tx.user.update({
              where: { id: event.userId },
              data: { credits: balanceAfter },
            });

            await tx.creditTransaction.create({
              data: {
                userId: event.userId,
                type: "REFUND",
                amount: creditsPerPhoto,
                balanceBefore,
                balanceAfter,
                reason: `Aucun dossard detecte (${creditsPerPhoto} credit${creditsPerPhoto > 1 ? "s" : ""})`,
                photoId,
                eventId,
              },
            });

            await tx.photo.update({
              where: { id: photoId },
              data: { creditRefunded: true },
            });
          });

          const uploadSession = (await import("@/lib/upload-session")).getUploadSession(sessionId);
          if (uploadSession) {
            updateUploadProgress(sessionId, {
              creditsRefunded: uploadSession.creditsRefunded + 1,
            });
          }
        }
      }
    }

    console.log(`[Batch] Photo ${photoId}: processing complete (${photoIndex + 1}/${totalPhotos})`);
  } catch (error) {
    console.error(`[Batch] Processing error for photo ${photoId}:`, error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const formData = await request.formData();
    const eventId = formData.get("eventId") as string | null;
    const sessionIdParam = formData.get("sessionId") as string | null;
    const processingModeParam = formData.get("processingMode") as string | null;
    const processingMode = (processingModeParam === "lite" || processingModeParam === "premium")
      ? processingModeParam
      : "lite"; // Default to lite
    const autoRetouch = formData.get("autoRetouch") === "true";
    const smartCrop = formData.get("smartCrop") === "true";
    const processingOptions = { autoRetouch, smartCrop };

    if (!eventId) {
      return NextResponse.json({ error: "ID d'evenement manquant" }, { status: 400 });
    }

    // Collect all files
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (key === "files" && value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    // Verify event ownership
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return NextResponse.json({ error: "Evenement non trouve" }, { status: 404 });
    }
    if (event.userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorise" }, { status: 403 });
    }

    // Check and deduct credits atomically
    const nbPhotos = files.length;
    const creditsPerPhoto = processingMode === "premium" ? 2 : 1; // Lite: 1 credit, Premium: 2 credits
    const totalCredits = nbPhotos * creditsPerPhoto;
    const planLabel = processingMode === "premium" ? "Premium" : "Lite";
    let creditsRemaining = 0;

    if (totalCredits > 0) {
      const creditResult = await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: session.user.id },
          select: { credits: true },
        });

        if (!user) throw new Error("User not found");
        if (user.credits < totalCredits) {
          throw new Error("INSUFFICIENT_CREDITS");
        }

        const balanceBefore = user.credits;
        const balanceAfter = balanceBefore - totalCredits;

        await tx.user.update({
          where: { id: session.user.id },
          data: { credits: balanceAfter },
        });

        await tx.creditTransaction.create({
          data: {
            userId: session.user.id,
            type: "DEDUCTION",
            amount: totalCredits,
            balanceBefore,
            balanceAfter,
            reason: `Import ${planLabel} de ${nbPhotos} photo${nbPhotos > 1 ? "s" : ""} (${creditsPerPhoto} cr/photo) - ${event.name}`,
            eventId,
          },
        });

        return { balanceAfter };
      }).catch((err) => {
        if (err.message === "INSUFFICIENT_CREDITS") return null;
        throw err;
      });

      if (!creditResult) {
        return NextResponse.json(
          { error: "Credits insuffisants", code: "INSUFFICIENT_CREDITS" },
          { status: 402 }
        );
      }
      creditsRemaining = creditResult.balanceAfter;
    }

    // Create upload session for progress tracking (use client-provided ID or generate new one)
    const sessionId = createUploadSession(session.user.id, eventId, nbPhotos, sessionIdParam || undefined);

    // Record upload start timestamp
    if (!event.uploadStartedAt) {
      await prisma.event.update({
        where: { id: eventId },
        data: { uploadStartedAt: new Date() },
      });
    }

    // Load valid bibs ONCE (cache for all photos)
    let validBibs: Set<string> | undefined;
    const startList = await prisma.startListEntry.findMany({
      where: { eventId },
      select: { bibNumber: true },
    });
    if (startList.length > 0) {
      validBibs = new Set(startList.map((s) => s.bibNumber));
    }

    // Save all files in parallel (with limited concurrency to avoid timeout)
    const photos: { id: string; jpegBuffer: Buffer; originalName: string; index: number; webPath: string | null }[] = [];
    const failedFiles: string[] = [];

    // Process files in batches (Caddy direct, no Cloudflare timeout constraint)
    const BATCH_SIZE = 15;
    for (let batchStart = 0; batchStart < files.length; batchStart += BATCH_SIZE) {
      const batch = files.slice(batchStart, batchStart + BATCH_SIZE);
      const batchPromises = batch.map(async (file, batchIndex) => {
        const fileIndex = batchStart + batchIndex;
        updateUploadProgress(sessionId, {
          currentStep: `Sauvegarde fichier ${fileIndex + 1}/${files.length}`,
        });

        try {
          const { filename, path, webPath, jpegBuffer, s3Key } = await saveFile(file, eventId);

          const photo = await prisma.photo.create({
            data: {
              filename,
              originalName: file.name,
              path,
              webPath,
              s3Key,
              eventId,
              creditDeducted: totalCredits > 0,
            },
          });

          return { id: photo.id, jpegBuffer, originalName: file.name, index: fileIndex, webPath: webPath || null };
        } catch (saveError) {
          console.error(`Failed to save file ${file.name}:`, saveError);
          return { error: file.name };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);

      // Process batch results
      for (const result of batchResults) {
        if (result.status === "fulfilled") {
          const value = result.value;
          if ("error" in value && value.error) {
            failedFiles.push(value.error);
          } else if ("id" in value && value.id && value.jpegBuffer && typeof value.index === "number") {
            photos.push({
              id: value.id,
              jpegBuffer: value.jpegBuffer,
              originalName: value.originalName,
              index: value.index,
              webPath: value.webPath,
            });
          }
        } else {
          console.error("Batch processing error:", result.reason);
        }
      }
    }

    // If all files failed, return error
    if (photos.length === 0) {
      return NextResponse.json(
        {
          error: "Impossible de traiter les fichiers",
          details: `${failedFiles.length} fichier(s) ont echoue: ${failedFiles.join(", ")}`,
          failedFiles
        },
        { status: 400 }
      );
    }

    // Enqueue all photos for processing
    let processedCount = 0;
    for (const photo of photos) {
      processingQueue.enqueue(async () => {
        try {
          await processPhotoWithProgress(
            photo.id,
            photo.jpegBuffer,
            photo.originalName,
            eventId,
            sessionId,
            photo.index,
            nbPhotos,
            processingMode,
            creditsPerPhoto,
            validBibs,
            processingOptions,
            photo.webPath
          );
        } catch (err) {
          console.error(`[Batch] Unhandled error for photo ${photo.id}:`, err);
        } finally {
          processedCount++;
          const isComplete = processedCount >= nbPhotos;

          updateUploadProgress(sessionId, {
            processed: processedCount,
            currentStep: isComplete ? "Termine !" : `Traitement en cours...`,
            complete: isComplete,
          });

          if (isComplete) {
            // Record upload completion timestamp
            await prisma.event.update({
              where: { id: eventId },
              data: { uploadCompletedAt: new Date() },
            });
            scheduleAutoClustering(eventId);
          }
        }
      });
    }

    return NextResponse.json({
      sessionId,
      totalPhotos: photos.length, // Only count successfully uploaded photos
      creditsDeducted: totalCredits,
      creditsRemaining,
      ...(failedFiles.length > 0 && {
        warnings: `${failedFiles.length} fichier(s) non traite(s)`,
        failedFiles
      })
    });
  } catch (error) {
    console.error("Batch upload error:", error);
    return NextResponse.json({ error: "Erreur lors de l'upload" }, { status: 500 });
  }
}
