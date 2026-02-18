import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userId = session.user.id;

    const [user, events, photoStats, orderStats, creditStats, monthlyData, topEvents, sportBreakdown, connectFees] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { credits: true, avgRating: true, totalReviews: true, createdAt: true, stripeOnboarded: true },
      }),
      prisma.event.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          status: true,
          sportType: true,
          date: true,
          _count: { select: { photos: true, orders: true, startListEntries: true } },
        },
        orderBy: { date: "desc" },
      }),
      prisma.photo.aggregate({
        where: { event: { userId } },
        _count: true,
        _avg: { qualityScore: true },
      }),
      prisma.order.aggregate({
        where: { event: { userId }, status: "PAID" },
        _sum: { totalAmount: true, platformFee: true },
        _count: true,
        _avg: { totalAmount: true },
      }),
      prisma.creditTransaction.aggregate({
        where: { userId },
        _sum: { amount: true },
        _count: true,
      }),
      // Monthly revenue last 12 months
      prisma.$queryRaw`
        SELECT
          TO_CHAR(DATE_TRUNC('month', o."createdAt"), 'YYYY-MM') as month,
          SUM(o."totalAmount")::float as revenue,
          COUNT(*)::int as orders
        FROM "Order" o
        JOIN "Event" e ON o."eventId" = e."id"
        WHERE e."userId" = ${userId} AND o."status" = 'PAID'
        GROUP BY DATE_TRUNC('month', o."createdAt")
        ORDER BY month DESC
        LIMIT 12
      `,
      // Top 5 events by revenue
      prisma.$queryRaw`
        SELECT
          e."name", e."date",
          SUM(o."totalAmount")::float as revenue,
          COUNT(o.*)::int as orders
        FROM "Order" o
        JOIN "Event" e ON o."eventId" = e."id"
        WHERE e."userId" = ${userId} AND o."status" = 'PAID'
        GROUP BY e."id", e."name", e."date"
        ORDER BY revenue DESC
        LIMIT 5
      `,
      // Sport type breakdown
      prisma.event.groupBy({
        by: ["sportType"],
        where: { userId },
        _count: true,
      }),
      // Connect fees breakdown
      prisma.order.aggregate({
        where: { event: { userId }, status: "PAID" },
        _sum: { serviceFee: true, stripeFee: true, photographerPayout: true },
      }),
    ]);

    // Additional derived metrics
    const totalPhotos = photoStats._count;
    const processedPhotos = await prisma.photo.count({ where: { event: { userId }, processedAt: { not: null } } });
    const blurryPhotos = await prisma.photo.count({ where: { event: { userId }, isBlurry: true } });
    const faceIndexedPhotos = await prisma.photo.count({ where: { event: { userId }, faceIndexed: true } });
    const bibDetected = await prisma.bibNumber.count({ where: { photo: { event: { userId } } } });
    const uniqueBibs = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT bn."number")::int as count
      FROM "BibNumber" bn
      JOIN "Photo" p ON bn."photoId" = p."id"
      JOIN "Event" e ON p."eventId" = e."id"
      WHERE e."userId" = ${userId}
    ` as { count: number }[];

    const publishedEvents = events.filter(e => e.status === "PUBLISHED").length;
    const totalRunners = events.reduce((sum, e) => sum + e._count.startListEntries, 0);

    return NextResponse.json({
      overview: {
        totalEvents: events.length,
        publishedEvents,
        totalPhotos,
        processedPhotos,
        blurryPhotos,
        faceIndexedPhotos,
        avgQuality: photoStats._avg.qualityScore || 0,
        totalRunners,
        credits: user?.credits || 0,
        rating: user?.avgRating || 0,
        totalReviews: user?.totalReviews || 0,
        memberSince: user?.createdAt,
        stripeOnboarded: user?.stripeOnboarded || false,
      },
      revenue: {
        total: orderStats._sum.totalAmount || 0,
        platformFees: orderStats._sum.platformFee || 0,
        net: (orderStats._sum.totalAmount || 0) - (orderStats._sum.platformFee || 0),
        paidOrders: orderStats._count,
        avgBasket: orderStats._avg.totalAmount || 0,
        serviceFees: connectFees._sum.serviceFee || 0,
        stripeFees: connectFees._sum.stripeFee || 0,
        photographerPayout: connectFees._sum.photographerPayout || 0,
      },
      credits: {
        balance: user?.credits || 0,
        totalTransactions: creditStats._count,
        totalSpent: creditStats._sum.amount || 0,
      },
      detection: {
        totalBibs: bibDetected,
        uniqueBibs: uniqueBibs[0]?.count || 0,
        ocrRate: totalPhotos > 0 ? ((bibDetected / totalPhotos) * 100).toFixed(1) : "0",
      },
      monthlyRevenue: monthlyData,
      topEvents,
      sportBreakdown,
      events: events.slice(0, 20),
    });
  } catch (error) {
    console.error("Error fetching photographer stats:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des statistiques" },
      { status: 500 }
    );
  }
}
