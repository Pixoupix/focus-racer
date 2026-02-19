import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    let dateFrom: Date | null = null;
    let dateTo: Date | null = null;

    if (fromParam) {
      dateFrom = new Date(fromParam);
      if (isNaN(dateFrom.getTime())) dateFrom = null;
    }
    if (toParam) {
      dateTo = new Date(toParam);
      if (isNaN(dateTo.getTime())) dateTo = null;
      else {
        // Include the full end day
        dateTo.setHours(23, 59, 59, 999);
      }
    }

    const periodLabel = dateFrom
      ? `${dateFrom.toISOString().slice(0, 10)}${dateTo ? " - " + dateTo.toISOString().slice(0, 10) : ""}`
      : "all";

    // Build date filter for Prisma queries
    const dateFilter = dateFrom
      ? { createdAt: { gte: dateFrom, ...(dateTo ? { lte: dateTo } : {}) } }
      : {};

    const [
      // --- USERS ---
      totalUsers,
      activeUsers,
      inactiveUsers,
      usersByRole,
      recentlyActiveUsers,
      signupTrend,
      newUsersInPeriod,
      stripeOnboarded,
      referralSourceGroups,

      // --- EVENTS ---
      totalEvents,
      eventsByStatus,
      eventsBySport,
      eventsWithPhotos,
      avgPhotosPerEvent,
      eventCreationTrend,
      newEventsInPeriod,

      // --- PHOTOS ---
      totalPhotos,
      processedPhotos,
      blurryPhotos,
      autoEditedPhotos,
      faceIndexedPhotos,
      photosWithBibs,
      ocrProviders,
      avgQualityScore,
      qualityDistribution,
      creditDeducted,
      creditRefunded,
      newPhotosInPeriod,

      // --- BIBS ---
      totalBibDetections,
      uniqueBibCount,
      bibsBySource,
      bibConfidenceDistribution,
      topBibs,

      // --- SALES ---
      ordersByStatus,
      paidOrderAggregates,
      refundedCount,
      guestVsRegistered,
      revenueByMonth,
      topEventsByRevenue,
      revenueByPackType,
      ordersInPeriod,
      revenueInPeriod,

      // --- CREDITS ---
      totalCreditsInCirculation,
      creditTransactionsByType,
      creditFlow,
      creditTransactionsInPeriod,

      // --- MARKETPLACE ---
      totalListings,
      listingsByStatus,
      totalApplications,
      applicationsByStatus,
      marketplaceReviewStats,
      avgBudget,
      listingsBySportType,

      // --- GDPR ---
      totalGdprRequests,
      gdprByType,
      gdprByStatus,
      gdprDeletedStats,
      gdprAvgProcessingTime,
      gdprPending,

      // --- STORAGE ---
      photosWithS3,
      photosWithWebPath,
      photosWithThumbnail,

      // --- DOWNLOADS ---
      downloadStats,
      ordersWithDownloads,
      neverDownloaded,
      expiredOrders,
      downloadDistribution,
    ] = await Promise.all([
      // --- USERS ---
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isActive: false } }),
      prisma.user.groupBy({ by: ["role"], _count: true }),
      prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(DISTINCT id)::int as count FROM "User"
        WHERE id IN (
          SELECT "userId" FROM "Event" WHERE "updatedAt" >= NOW() - INTERVAL '24 hours'
          UNION
          SELECT "userId" FROM "Order" WHERE "userId" IS NOT NULL AND "updatedAt" >= NOW() - INTERVAL '24 hours'
        )
      `,
      prisma.$queryRaw<{ month: string; count: number }[]>`
        SELECT TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') as month,
               COUNT(*)::int as count
        FROM "User"
        WHERE "createdAt" >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month ASC
      `,
      dateFrom
        ? prisma.user.count({ where: dateFilter })
        : prisma.user.count(),
      prisma.user.count({ where: { stripeOnboarded: true } }),
      prisma.user.groupBy({ by: ["referralSource"], _count: true }),

      // --- EVENTS ---
      prisma.event.count(),
      prisma.event.groupBy({ by: ["status"], _count: true }),
      prisma.event.groupBy({ by: ["sportType"], _count: true }),
      prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(DISTINCT e.id)::int as count FROM "Event" e
        INNER JOIN "Photo" p ON p."eventId" = e.id
      `,
      prisma.$queryRaw<[{ avg: number }]>`
        SELECT COALESCE(AVG(cnt), 0)::float as avg FROM (
          SELECT COUNT(*)::int as cnt FROM "Photo" GROUP BY "eventId"
        ) sub
      `,
      prisma.$queryRaw<{ month: string; count: number }[]>`
        SELECT TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') as month,
               COUNT(*)::int as count
        FROM "Event"
        WHERE "createdAt" >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month ASC
      `,
      dateFrom
        ? prisma.event.count({ where: dateFilter })
        : prisma.event.count(),

      // --- PHOTOS ---
      prisma.photo.count(),
      prisma.photo.count({ where: { processedAt: { not: null } } }),
      prisma.photo.count({ where: { isBlurry: true } }),
      prisma.photo.count({ where: { autoEdited: true } }),
      prisma.photo.count({ where: { faceIndexed: true } }),
      prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(DISTINCT p.id)::int as count FROM "Photo" p
        INNER JOIN "BibNumber" b ON b."photoId" = p.id
      `,
      prisma.photo.groupBy({
        by: ["ocrProvider"],
        where: { ocrProvider: { not: null } },
        _count: true,
      }),
      prisma.photo.aggregate({
        where: { qualityScore: { not: null } },
        _avg: { qualityScore: true },
      }),
      prisma.$queryRaw<{ range: string; count: number }[]>`
        SELECT
          CASE
            WHEN "qualityScore" < 20 THEN '0-20'
            WHEN "qualityScore" < 40 THEN '20-40'
            WHEN "qualityScore" < 60 THEN '40-60'
            WHEN "qualityScore" < 80 THEN '60-80'
            ELSE '80-100'
          END as range,
          COUNT(*)::int as count
        FROM "Photo"
        WHERE "qualityScore" IS NOT NULL
        GROUP BY range
        ORDER BY range ASC
      `,
      prisma.photo.count({ where: { creditDeducted: true } }),
      prisma.photo.count({ where: { creditRefunded: true } }),
      dateFrom
        ? prisma.photo.count({ where: dateFilter })
        : prisma.photo.count(),

      // --- BIBS ---
      prisma.bibNumber.count(),
      prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(DISTINCT number)::int as count FROM "BibNumber"
      `,
      prisma.bibNumber.groupBy({ by: ["source"], _count: true }),
      prisma.$queryRaw<{ range: string; count: number }[]>`
        SELECT
          CASE
            WHEN confidence IS NULL THEN 'inconnu'
            WHEN confidence < 50 THEN '0-50'
            WHEN confidence < 70 THEN '50-70'
            WHEN confidence < 85 THEN '70-85'
            WHEN confidence < 95 THEN '85-95'
            ELSE '95-100'
          END as range,
          COUNT(*)::int as count
        FROM "BibNumber"
        GROUP BY range
        ORDER BY range ASC
      `,
      prisma.$queryRaw<{ number: string; photoCount: number }[]>`
        SELECT number, COUNT(*)::int as "photoCount"
        FROM "BibNumber"
        GROUP BY number
        ORDER BY "photoCount" DESC
        LIMIT 10
      `,

      // --- SALES ---
      prisma.order.groupBy({ by: ["status"], _count: true, _sum: { totalAmount: true } }),
      prisma.order.aggregate({
        where: { status: "PAID" },
        _sum: { totalAmount: true, platformFee: true },
        _count: true,
        _avg: { totalAmount: true },
      }),
      prisma.order.count({ where: { status: "REFUNDED" } }),
      prisma.$queryRaw<[{ guest: number; registered: number }]>`
        SELECT
          COUNT(CASE WHEN "userId" IS NULL THEN 1 END)::int as guest,
          COUNT(CASE WHEN "userId" IS NOT NULL THEN 1 END)::int as registered
        FROM "Order"
        WHERE status = 'PAID'
      `,
      prisma.$queryRaw<{ month: string; revenue: number; orders: number; fees: number }[]>`
        SELECT
          TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') as month,
          COALESCE(SUM("totalAmount"), 0)::float as revenue,
          COUNT(*)::int as orders,
          COALESCE(SUM("platformFee"), 0)::float as fees
        FROM "Order"
        WHERE status = 'PAID'
          AND "createdAt" >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month ASC
      `,
      prisma.$queryRaw<{ eventId: string; eventName: string; revenue: number; orders: number }[]>`
        SELECT
          o."eventId" as "eventId",
          e.name as "eventName",
          COALESCE(SUM(o."totalAmount"), 0)::float as revenue,
          COUNT(*)::int as orders
        FROM "Order" o
        JOIN "Event" e ON e.id = o."eventId"
        WHERE o.status = 'PAID'
        GROUP BY o."eventId", e.name
        ORDER BY revenue DESC
        LIMIT 10
      `,
      prisma.$queryRaw<{ type: string; count: number; revenue: number }[]>`
        SELECT
          COALESCE(pp.type::text, 'SANS_PACK') as type,
          COUNT(*)::int as count,
          COALESCE(SUM(o."totalAmount"), 0)::float as revenue
        FROM "Order" o
        LEFT JOIN "PricePack" pp ON pp.id = o."packId"
        WHERE o.status = 'PAID'
        GROUP BY pp.type
      `,
      dateFrom
        ? prisma.order.count({ where: { status: "PAID", ...dateFilter } })
        : prisma.order.count({ where: { status: "PAID" } }),
      dateFrom
        ? prisma.order.aggregate({
            where: { status: "PAID", ...dateFilter },
            _sum: { totalAmount: true },
          })
        : prisma.order.aggregate({
            where: { status: "PAID" },
            _sum: { totalAmount: true },
          }),

      // --- CREDITS ---
      prisma.user.aggregate({ _sum: { credits: true } }),
      prisma.$queryRaw<{ type: string; count: number; totalAmount: number }[]>`
        SELECT type::text, COUNT(*)::int as count, COALESCE(SUM(amount), 0)::int as "totalAmount"
        FROM "CreditTransaction"
        GROUP BY type
      `,
      prisma.$queryRaw<{ month: string; deductions: number; refunds: number; purchases: number; grants: number }[]>`
        SELECT
          TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') as month,
          COALESCE(SUM(CASE WHEN type = 'DEDUCTION' THEN amount ELSE 0 END), 0)::int as deductions,
          COALESCE(SUM(CASE WHEN type = 'REFUND' THEN amount ELSE 0 END), 0)::int as refunds,
          COALESCE(SUM(CASE WHEN type = 'PURCHASE' THEN amount ELSE 0 END), 0)::int as purchases,
          COALESCE(SUM(CASE WHEN type = 'ADMIN_GRANT' THEN amount ELSE 0 END), 0)::int as grants
        FROM "CreditTransaction"
        WHERE "createdAt" >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month ASC
      `,
      dateFrom
        ? prisma.creditTransaction.count({ where: dateFilter })
        : prisma.creditTransaction.count(),

      // --- MARKETPLACE ---
      prisma.marketplaceListing.count(),
      prisma.marketplaceListing.groupBy({ by: ["status"], _count: true }),
      prisma.marketplaceApplication.count(),
      prisma.marketplaceApplication.groupBy({ by: ["status"], _count: true }),
      prisma.marketplaceReview.aggregate({ _avg: { rating: true }, _count: true }),
      prisma.marketplaceListing.aggregate({
        where: { budget: { not: null } },
        _avg: { budget: true },
      }),
      prisma.marketplaceListing.groupBy({ by: ["sportType"], _count: true }),

      // --- GDPR ---
      prisma.gdprRequest.count(),
      prisma.gdprRequest.groupBy({ by: ["type"], _count: true }),
      prisma.gdprRequest.groupBy({ by: ["status"], _count: true }),
      prisma.gdprRequest.aggregate({
        where: { status: "COMPLETED" },
        _sum: { photosDeleted: true, facesDeleted: true },
      }),
      prisma.$queryRaw<[{ avgHours: number }]>`
        SELECT COALESCE(
          AVG(EXTRACT(EPOCH FROM ("processedAt" - "createdAt")) / 3600), 0
        )::float as "avgHours"
        FROM "GdprRequest"
        WHERE "processedAt" IS NOT NULL
      `,
      prisma.gdprRequest.count({ where: { status: "PENDING" } }),

      // --- STORAGE ---
      prisma.photo.count({ where: { s3Key: { not: null } } }),
      prisma.photo.count({ where: { webPath: { not: null } } }),
      prisma.photo.count({ where: { thumbnailPath: { not: null } } }),

      // --- DOWNLOADS ---
      prisma.order.aggregate({
        where: { status: { in: ["PAID", "DELIVERED"] } },
        _sum: { downloadCount: true },
      }),
      prisma.order.count({
        where: { status: { in: ["PAID", "DELIVERED"] }, downloadCount: { gt: 0 } },
      }),
      prisma.order.count({ where: { status: "PAID", downloadCount: 0 } }),
      prisma.order.count({ where: { status: "EXPIRED" } }),
      prisma.$queryRaw<{ range: string; count: number }[]>`
        SELECT
          CASE
            WHEN "downloadCount" = 0 THEN '0'
            WHEN "downloadCount" = 1 THEN '1'
            WHEN "downloadCount" <= 3 THEN '2-3'
            WHEN "downloadCount" <= 5 THEN '4-5'
            ELSE '6+'
          END as range,
          COUNT(*)::int as count
        FROM "Order"
        WHERE status IN ('PAID', 'DELIVERED')
        GROUP BY range
        ORDER BY range ASC
      `,
    ]);

    // Helpers
    const toRecord = (groups: any[], key: string) =>
      groups.reduce((acc: Record<string, number>, g: any) => {
        acc[g[key]] = g._count;
        return acc;
      }, {});

    const totalAllOrders = ordersByStatus.reduce((s: number, g: any) => s + g._count, 0);
    const totalPaidOrders = paidOrderAggregates._count;
    const photosWithBibsCount = (photosWithBibs as any)[0]?.count || 0;

    // Marketplace acceptance rate
    const appStatusRecord = toRecord(applicationsByStatus, "status");
    const decidedApps = (appStatusRecord["ACCEPTED"] || 0) + (appStatusRecord["REJECTED"] || 0);
    const acceptanceRate = decidedApps > 0 ? ((appStatusRecord["ACCEPTED"] || 0) / decidedApps) * 100 : 0;

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      period: periodLabel,

      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        byRole: toRecord(usersByRole, "role"),
        recentlyActive: (recentlyActiveUsers as any)[0]?.count || 0,
        signupTrend: signupTrend,
        newInPeriod: newUsersInPeriod,
        stripeOnboarded,
        byReferralSource: referralSourceGroups.reduce((acc: Record<string, number>, g: any) => {
          acc[g.referralSource || "null"] = g._count;
          return acc;
        }, {}),
      },

      events: {
        total: totalEvents,
        byStatus: toRecord(eventsByStatus, "status"),
        bySportType: toRecord(eventsBySport, "sportType"),
        withPhotos: (eventsWithPhotos as any)[0]?.count || 0,
        avgPhotosPerEvent: Math.round(((avgPhotosPerEvent as any)[0]?.avg || 0) * 10) / 10,
        creationTrend: eventCreationTrend,
        newInPeriod: newEventsInPeriod,
      },

      photos: {
        total: totalPhotos,
        processed: processedPhotos,
        blurry: blurryPhotos,
        autoEdited: autoEditedPhotos,
        faceIndexed: faceIndexedPhotos,
        withBibs: photosWithBibsCount,
        orphans: totalPhotos - photosWithBibsCount,
        ocrSuccessRate:
          processedPhotos > 0
            ? Math.round((photosWithBibsCount / processedPhotos) * 1000) / 10
            : 0,
        avgQualityScore: Math.round((avgQualityScore._avg.qualityScore || 0) * 10) / 10,
        qualityDistribution,
        byOcrProvider: ocrProviders.reduce((acc: Record<string, number>, p: any) => {
          acc[p.ocrProvider || "inconnu"] = p._count;
          return acc;
        }, {}),
        creditDeducted,
        creditRefunded,
        newInPeriod: newPhotosInPeriod,
      },

      bibs: {
        totalDetections: totalBibDetections,
        uniqueBibs: (uniqueBibCount as any)[0]?.count || 0,
        bySource: toRecord(bibsBySource, "source"),
        confidenceDistribution: bibConfidenceDistribution,
        avgPhotosPerBib:
          ((uniqueBibCount as any)[0]?.count || 0) > 0
            ? Math.round((totalBibDetections / ((uniqueBibCount as any)[0]?.count || 1)) * 10) / 10
            : 0,
        coverageRate:
          totalPhotos > 0
            ? Math.round((photosWithBibsCount / totalPhotos) * 1000) / 10
            : 0,
        topBibs,
      },

      sales: {
        totalRevenue: paidOrderAggregates._sum.totalAmount || 0,
        totalPlatformFees: paidOrderAggregates._sum.platformFee || 0,
        netPhotographerRevenue:
          (paidOrderAggregates._sum.totalAmount || 0) -
          (paidOrderAggregates._sum.platformFee || 0),
        ordersByStatus: ordersByStatus.reduce((acc: Record<string, number>, g: any) => {
          acc[g.status] = g._count;
          return acc;
        }, {}),
        totalOrders: totalAllOrders,
        paidOrders: totalPaidOrders,
        avgOrderValue: Math.round((paidOrderAggregates._avg.totalAmount || 0) * 100) / 100,
        refundRate:
          totalAllOrders > 0
            ? Math.round((refundedCount / totalAllOrders) * 1000) / 10
            : 0,
        guestVsRegistered: (guestVsRegistered as any)[0] || { guest: 0, registered: 0 },
        revenueByMonth,
        topEventsByRevenue,
        revenueByPackType: (revenueByPackType as any[]).reduce(
          (acc: Record<string, { count: number; revenue: number }>, r: any) => {
            acc[r.type] = { count: r.count, revenue: r.revenue };
            return acc;
          },
          {}
        ),
        revenueInPeriod: (revenueInPeriod as any)._sum?.totalAmount || 0,
        ordersInPeriod,
      },

      credits: {
        totalInCirculation: totalCreditsInCirculation._sum.credits || 0,
        transactionsByType: (creditTransactionsByType as any[]).reduce(
          (acc: Record<string, { count: number; totalAmount: number }>, t: any) => {
            acc[t.type] = { count: t.count, totalAmount: t.totalAmount };
            return acc;
          },
          {}
        ),
        recentFlow: creditFlow,
        transactionsInPeriod: creditTransactionsInPeriod,
      },

      marketplace: {
        totalListings,
        listingsByStatus: toRecord(listingsByStatus, "status"),
        totalApplications,
        applicationsByStatus: appStatusRecord,
        acceptanceRate: Math.round(acceptanceRate * 10) / 10,
        avgRating: Math.round((marketplaceReviewStats._avg.rating || 0) * 10) / 10,
        totalReviews: marketplaceReviewStats._count,
        avgBudget: Math.round((avgBudget._avg.budget || 0) * 100) / 100,
        listingsBySportType: toRecord(listingsBySportType, "sportType"),
      },

      gdpr: {
        totalRequests: totalGdprRequests,
        byType: toRecord(gdprByType, "type"),
        byStatus: toRecord(gdprByStatus, "status"),
        totalPhotosDeleted: gdprDeletedStats._sum.photosDeleted || 0,
        totalFacesDeleted: gdprDeletedStats._sum.facesDeleted || 0,
        avgProcessingTimeHours: Math.round(((gdprAvgProcessingTime as any)[0]?.avgHours || 0) * 10) / 10,
        pendingCount: gdprPending,
      },

      storage: {
        totalPhotos,
        withS3Key: photosWithS3,
        localOnly: totalPhotos - photosWithS3,
        withWebPath: photosWithWebPath,
        withThumbnail: photosWithThumbnail,
        estimatedStorageMB: Math.round(totalPhotos * 2.5),
      },

      downloads: {
        totalDownloads: downloadStats._sum.downloadCount || 0,
        ordersWithDownloads,
        avgDownloadsPerOrder:
          ordersWithDownloads > 0
            ? Math.round(((downloadStats._sum.downloadCount || 0) / ordersWithDownloads) * 10) / 10
            : 0,
        expiredOrders,
        neverDownloaded,
        downloadDistribution,
      },
    });
  } catch (error) {
    console.error("Error fetching admin data:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation des donnees" },
      { status: 500 }
    );
  }
}
