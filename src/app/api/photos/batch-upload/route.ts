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
import {
  createUploadSession,
  updateUploadProgress,
} from "@/lib/upload-session";

async function processPhotoWithProgress(
  photoId: string,
  webFilePath: string,
  eventId: string,
  eventName: string,
  sessionId: string,
  photoIndex: number,
  totalPhotos: number,
  ocrProvider?: "aws" | "tesseract",
  creditsPerPhoto: number = 1
) {
  const isPremium = ocrProvider === "aws";

  try {
    const webFullPath = await getUploadedFilePath(webFilePath);

    // Premium only: quality analysis, auto-edit, watermark
    if (isPremium) {
      updateUploadProgress(sessionId, {
        currentStep: `Analyse qualite (${photoIndex + 1}/${totalPhotos})`,
      });

      // 1. Quality analysis
      const quality = await analyzeQuality(webFullPath);
      await prisma.photo.update({
        where: { id: photoId },
        data: { qualityScore: quality.score, isBlurry: quality.isBlurry },
      });

      // 2. Auto-edit
      if (!quality.isBlurry && aiConfig.autoEditEnabled) {
        const wasEdited = await autoEditImage(webFullPath);
        if (wasEdited) {
          await prisma.photo.update({
            where: { id: photoId },
            data: { autoEdited: true },
          });
        }
      }

      // 3. Watermark
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
        console.error(`[Batch] Watermark error for ${photoId}:`, err);
      }
    }

    updateUploadProgress(sessionId, {
      currentStep: `OCR dossards (${photoIndex + 1}/${totalPhotos})`,
    });

    // 4. OCR
    let validBibs: Set<string> | undefined;
    const startList = await prisma.startListEntry.findMany({
      where: { eventId },
      select: { bibNumber: true },
    });
    if (startList.length > 0) {
      validBibs = new Set(startList.map((s) => s.bibNumber));
    }

    const ocrResult = await processPhotoOCR(webFullPath, validBibs, ocrProvider);

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
      data: { ocrProvider: ocrResult.provider, processedAt: new Date() },
    });

    // Refund credit if no bib detected
    if (ocrResult.numbers.length === 0) {
      const photo = await prisma.photo.findUnique({
        where: { id: photoId },
        select: { creditDeducted: true, creditRefunded: true },
      });

      if (photo && photo.creditDeducted && !photo.creditRefunded) {
        // Get userId from photo's event owner
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

          // Update session refund counter
          const uploadSession = (await import("@/lib/upload-session")).getUploadSession(sessionId);
          if (uploadSession) {
            updateUploadProgress(sessionId, {
              creditsRefunded: uploadSession.creditsRefunded + 1,
            });
          }
        }
      }
    }

    // 5. Face indexing (Premium only)
    if (isPremium && aiConfig.faceIndexEnabled) {
      updateUploadProgress(sessionId, {
        currentStep: `Reconnaissance faciale (${photoIndex + 1}/${totalPhotos})`,
      });
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
        }
      } catch (err) {
        console.error(`[Batch] Face indexing error for ${photoId}:`, err);
      }
    }

    // 6. Label detection (Premium only)
    if (isPremium && aiConfig.labelDetectionEnabled) {
      try {
        const labels = await detectLabels(webFullPath, 15, 60);
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
      } catch (err) {
        console.error(`[Batch] Label detection error for ${photoId}:`, err);
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
    const ocrProviderParam = formData.get("ocrProvider") as string | null;
    const ocrProvider = (ocrProviderParam === "aws" || ocrProviderParam === "tesseract")
      ? ocrProviderParam
      : undefined;

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

    // Check and deduct credits atomically (premium only)
    const nbPhotos = files.length;
    const creditsPerPhoto = ocrProvider === "aws" ? 3 : 0;
    const totalCredits = nbPhotos * creditsPerPhoto;
    const planLabel = ocrProvider === "aws" ? "Premium" : "Gratuit";
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

    // Save all files and create photo records
    const photos: { id: string; webPath: string; index: number }[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const { filename, path, webPath, s3Key } = await saveFile(file, eventId);

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

      photos.push({ id: photo.id, webPath, index: i });
    }

    // Create upload session for progress tracking
    const sessionId = createUploadSession(session.user.id, eventId, nbPhotos);

    // Enqueue all photos for processing
    let processedCount = 0;
    for (const photo of photos) {
      processingQueue.enqueue(async () => {
        await processPhotoWithProgress(
          photo.id,
          photo.webPath,
          eventId,
          event.name,
          sessionId,
          photo.index,
          nbPhotos,
          ocrProvider,
          creditsPerPhoto
        );

        processedCount++;
        const isComplete = processedCount >= nbPhotos;

        updateUploadProgress(sessionId, {
          processed: processedCount,
          currentStep: isComplete ? "Termine !" : `Traitement en cours...`,
          complete: isComplete,
        });

        if (isComplete) {
          scheduleAutoClustering(eventId);
        }
      });
    }

    return NextResponse.json({
      sessionId,
      totalPhotos: nbPhotos,
      creditsDeducted: totalCredits,
      creditsRemaining,
    });
  } catch (error) {
    console.error("Batch upload error:", error);
    return NextResponse.json({ error: "Erreur lors de l'upload" }, { status: 500 });
  }
}
