import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id: eventId } = params;

    // Verify event ownership
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        userId: true,
        createdAt: true,
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Événement non trouvé" }, { status: 404 });
    }

    if (event.userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    // Get all photos for this event with related data
    const photos = await prisma.photo.findMany({
      where: { eventId },
      include: {
        bibNumbers: true,
        orderItems: {
          include: {
            order: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Calculate statistics
    const totalPhotos = photos.length;
    const photosWithBibs = photos.filter((p) => p.bibNumbers.length > 0);
    const orphanPhotos = photos.filter((p) => p.bibNumbers.length === 0);

    // Unique bib numbers
    const uniqueBibs = new Set<string>();
    photos.forEach((p) => {
      p.bibNumbers.forEach((bib) => uniqueBibs.add(bib.number));
    });

    // Photos per bib number
    const bibStats: Record<string, number> = {};
    photos.forEach((p) => {
      p.bibNumbers.forEach((bib) => {
        bibStats[bib.number] = (bibStats[bib.number] || 0) + 1;
      });
    });

    const avgPhotosPerBib =
      uniqueBibs.size > 0
        ? photosWithBibs.length / uniqueBibs.size
        : 0;

    // Processing time (first photo to last processed photo)
    const processedPhotos = photos.filter((p) => p.processedAt);
    let avgProcessingTime = 0;
    let totalProcessingTime = 0;

    if (processedPhotos.length > 0) {
      const times = processedPhotos.map((p) => {
        if (p.processedAt && p.createdAt) {
          return p.processedAt.getTime() - p.createdAt.getTime();
        }
        return 0;
      });
      totalProcessingTime = times.reduce((a, b) => a + b, 0);
      avgProcessingTime = totalProcessingTime / processedPhotos.length;
    }

    // Credits used (count photos that deducted credits)
    const creditsDeducted = photos.filter((p) => p.creditDeducted).length;
    const creditsRefunded = photos.filter((p) => p.creditRefunded).length;
    const netCreditsUsed = creditsDeducted - creditsRefunded;

    // OCR provider stats
    const tesseractCount = photos.filter((p) => p.ocrProvider === "ocr_tesseract").length;
    const awsCount = photos.filter((p) => p.ocrProvider === "ocr_aws").length;

    const tesseractSuccess = photos.filter(
      (p) => p.ocrProvider === "ocr_tesseract" && p.bibNumbers.length > 0
    ).length;
    const awsSuccess = photos.filter(
      (p) => p.ocrProvider === "ocr_aws" && p.bibNumbers.length > 0
    ).length;

    const tesseractSuccessRate = tesseractCount > 0 ? (tesseractSuccess / tesseractCount) * 100 : 0;
    const awsSuccessRate = awsCount > 0 ? (awsSuccess / awsCount) * 100 : 0;

    // Quality stats
    const qualityScores = photos
      .filter((p) => p.qualityScore !== null)
      .map((p) => p.qualityScore as number);
    const avgQuality =
      qualityScores.length > 0
        ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
        : 0;

    const blurryCount = photos.filter((p) => p.isBlurry === true).length;
    const autoEditedCount = photos.filter((p) => p.autoEdited === true).length;

    // Revenue stats
    const completedOrders = photos.flatMap((p) =>
      p.orderItems
        .filter((item) => item.order.status === "PAID")
        .map((item) => ({
          amount: item.unitPrice,
          orderId: item.order.id,
        }))
    );

    const uniqueOrders = new Set(completedOrders.map((o) => o.orderId));
    const totalRevenue = completedOrders.reduce((sum, o) => sum + o.amount, 0);
    const avgOrderValue = uniqueOrders.size > 0 ? totalRevenue / uniqueOrders.size : 0;

    // Uploads timeline (group by day)
    const uploadsByDay: Record<string, number> = {};
    photos.forEach((p) => {
      const day = p.createdAt.toISOString().split("T")[0];
      uploadsByDay[day] = (uploadsByDay[day] || 0) + 1;
    });

    // Top bibs (most photos)
    const topBibs = Object.entries(bibStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([bib, count]) => ({ bib, count }));

    // Orphan photos details (for manual assignment)
    const orphanPhotosDetails = orphanPhotos.slice(0, 50).map((p) => ({
      id: p.id,
      filename: p.originalName,
      thumbnailPath: p.thumbnailPath,
      webPath: p.webPath,
      path: p.path,
      createdAt: p.createdAt,
      ocrProvider: p.ocrProvider,
      qualityScore: p.qualityScore,
      isBlurry: p.isBlurry,
    }));

    // Return analytics
    return NextResponse.json({
      event: {
        id: event.id,
        name: event.name,
        createdAt: event.createdAt,
      },
      summary: {
        totalPhotos,
        photosWithBibs: photosWithBibs.length,
        orphanPhotos: orphanPhotos.length,
        uniqueBibs: uniqueBibs.size,
        avgPhotosPerBib: Math.round(avgPhotosPerBib * 10) / 10,
        successRate: totalPhotos > 0 ? Math.round((photosWithBibs.length / totalPhotos) * 100) : 0,
        avgProcessingTime: Math.round(avgProcessingTime / 1000), // seconds
        totalProcessingTime: Math.round(totalProcessingTime / 1000), // seconds
        creditsDeducted,
        creditsRefunded,
        netCreditsUsed,
      },
      quality: {
        avgQuality: Math.round(avgQuality * 10) / 10,
        blurryCount,
        blurryPercent: totalPhotos > 0 ? Math.round((blurryCount / totalPhotos) * 100) : 0,
        autoEditedCount,
        autoEditedPercent: totalPhotos > 0 ? Math.round((autoEditedCount / totalPhotos) * 100) : 0,
      },
      ocr: {
        tesseract: {
          total: tesseractCount,
          success: tesseractSuccess,
          successRate: Math.round(tesseractSuccessRate),
        },
        aws: {
          total: awsCount,
          success: awsSuccess,
          successRate: Math.round(awsSuccessRate),
        },
      },
      revenue: {
        totalRevenue: totalRevenue / 100, // cents to euros
        totalOrders: uniqueOrders.size,
        avgOrderValue: avgOrderValue / 100,
        soldPhotos: completedOrders.length,
        conversionRate:
          totalPhotos > 0 ? Math.round((completedOrders.length / totalPhotos) * 100) : 0,
      },
      timeline: {
        uploadsByDay: Object.entries(uploadsByDay).map(([day, count]) => ({
          day,
          count,
        })),
        firstUpload: photos.length > 0 ? photos[0].createdAt : null,
        lastUpload: photos.length > 0 ? photos[photos.length - 1].createdAt : null,
      },
      topBibs,
      orphanPhotos: {
        total: orphanPhotos.length,
        photos: orphanPhotosDetails,
      },
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des analytics" },
      { status: 500 }
    );
  }
}
