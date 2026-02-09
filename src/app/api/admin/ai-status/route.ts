import { NextResponse } from "next/server";
import { aiConfig } from "@/lib/ai-config";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    // Get processing stats
    const [totalPhotos, processedPhotos, blurryPhotos, faceIndexedPhotos, autoEditedPhotos] =
      await Promise.all([
        prisma.photo.count(),
        prisma.photo.count({ where: { processedAt: { not: null } } }),
        prisma.photo.count({ where: { isBlurry: true } }),
        prisma.photo.count({ where: { faceIndexed: true } }),
        prisma.photo.count({ where: { autoEdited: true } }),
      ]);

    // OCR provider distribution
    const ocrProviders = await prisma.photo.groupBy({
      by: ["ocrProvider"],
      where: { ocrProvider: { not: null } },
      _count: true,
    });

    return NextResponse.json({
      config: {
        awsEnabled: aiConfig.awsEnabled,
        s3Enabled: aiConfig.s3Enabled,
        autoEditEnabled: aiConfig.autoEditEnabled,
        faceIndexEnabled: aiConfig.faceIndexEnabled,
        labelDetectionEnabled: aiConfig.labelDetectionEnabled,
        ocrConfidenceThreshold: aiConfig.ocrConfidenceThreshold,
        qualityThreshold: aiConfig.qualityThreshold,
        region: aiConfig.region,
        s3Bucket: aiConfig.s3Bucket || "(non configuré)",
        cloudfrontUrl: aiConfig.cloudfrontUrl || "(non configuré)",
      },
      stats: {
        totalPhotos,
        processedPhotos,
        blurryPhotos,
        faceIndexedPhotos,
        autoEditedPhotos,
        ocrProviders: ocrProviders.reduce(
          (acc, p) => {
            acc[p.ocrProvider || "unknown"] = p._count;
            return acc;
          },
          {} as Record<string, number>
        ),
      },
    });
  } catch (error) {
    console.error("AI status error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
