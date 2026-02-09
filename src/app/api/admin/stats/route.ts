import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const [
      totalUsers,
      usersByRole,
      totalEvents,
      publishedEvents,
      totalPhotos,
      totalBibNumbers,
      recentUsers,
      orderStats,
      recentOrders,
      monthlyRevenue,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.groupBy({
        by: ["role"],
        _count: true,
      }),
      prisma.event.count(),
      prisma.event.count({ where: { status: "PUBLISHED" } }),
      prisma.photo.count(),
      prisma.bibNumber.count(),
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      // Order/revenue aggregates
      prisma.order.aggregate({
        where: { status: "PAID" },
        _sum: { totalAmount: true, platformFee: true },
        _count: true,
        _avg: { totalAmount: true },
      }),
      // Recent orders
      prisma.order.findMany({
        where: { status: { in: ["PAID", "REFUNDED"] } },
        select: {
          id: true,
          totalAmount: true,
          platformFee: true,
          status: true,
          createdAt: true,
          guestEmail: true,
          user: { select: { name: true, email: true } },
          event: { select: { name: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      // Monthly revenue (last 12 months)
      prisma.$queryRaw<{ month: string; revenue: number; orders: number }[]>`
        SELECT
          TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') as month,
          COALESCE(SUM("totalAmount"), 0)::float as revenue,
          COUNT(*)::int as orders
        FROM "Order"
        WHERE status = 'PAID'
          AND "createdAt" >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month DESC
      `,
    ]);

    const roleStats = usersByRole.reduce(
      (acc, item) => {
        acc[item.role] = item._count;
        return acc;
      },
      {} as Record<string, number>
    );

    // Pending orders count
    const pendingOrders = await prisma.order.count({
      where: { status: "PENDING" },
    });

    return NextResponse.json({
      totalUsers,
      roleStats,
      totalEvents,
      publishedEvents,
      totalPhotos,
      totalBibNumbers,
      recentUsers,
      // Revenue data
      revenue: {
        totalCA: orderStats._sum.totalAmount || 0,
        totalPlatformFees: orderStats._sum.platformFee || 0,
        totalOrders: orderStats._count,
        avgOrderValue: orderStats._avg.totalAmount || 0,
        pendingOrders,
      },
      recentOrders,
      monthlyRevenue,
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des statistiques" },
      { status: 500 }
    );
  }
}
