import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const dateFilter: Record<string, Date> = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      dateFilter.lte = toDate;
    }
    const whereDate: Record<string, unknown> = {};
    if (from || to) whereDate.createdAt = dateFilter;

    const [totalRevenue, totalOrders, refundedOrders, monthlyRevenue, packBreakdown, topEvents] =
      await Promise.all([
        // Total revenue from paid orders (with optional date filter)
        prisma.order.aggregate({
          where: { ...whereDate, status: "PAID" },
          _sum: { totalAmount: true, platformFee: true },
          _count: true,
          _avg: { totalAmount: true },
        }),
        // Total orders count (all statuses, with optional date filter)
        prisma.order.count({ where: whereDate }),
        // Refunded orders count
        prisma.order.count({ where: { ...whereDate, status: "REFUNDED" } }),
        // Monthly revenue (last 6 months) using raw SQL
        prisma.$queryRaw<
          { month: string; revenue: number; fees: number; orders: number }[]
        >`
        SELECT
          TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') as month,
          COALESCE(SUM("totalAmount"), 0)::float as revenue,
          COALESCE(SUM("platformFee"), 0)::float as fees,
          COUNT(*)::int as orders
        FROM "Order"
        WHERE "status" = 'PAID'
          AND "createdAt" >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month ASC
      `,
        // Revenue by pack type
        prisma.$queryRaw<
          { pack_type: string | null; revenue: number; orders: number }[]
        >`
        SELECT
          pp."type" as pack_type,
          COALESCE(SUM(o."totalAmount"), 0)::float as revenue,
          COUNT(*)::int as orders
        FROM "Order" o
        LEFT JOIN "PricePack" pp ON o."packId" = pp."id"
        WHERE o."status" = 'PAID'
        GROUP BY pp."type"
        ORDER BY revenue DESC
      `,
        // Top 5 events by revenue
        prisma.$queryRaw<
          {
            id: string;
            name: string;
            date: Date;
            revenue: number;
            orders: number;
          }[]
        >`
        SELECT
          e."id", e."name", e."date",
          COALESCE(SUM(o."totalAmount"), 0)::float as revenue,
          COUNT(o.*)::int as orders
        FROM "Order" o
        JOIN "Event" e ON o."eventId" = e."id"
        WHERE o."status" = 'PAID'
        GROUP BY e."id", e."name", e."date"
        ORDER BY revenue DESC
        LIMIT 5
      `,
      ]);

    return NextResponse.json({
      revenue: {
        total: totalRevenue._sum.totalAmount || 0,
        platformFees: totalRevenue._sum.platformFee || 0,
        net:
          (totalRevenue._sum.totalAmount || 0) -
          (totalRevenue._sum.platformFee || 0),
        avgBasket: totalRevenue._avg.totalAmount || 0,
        paidOrders: totalRevenue._count,
      },
      totalOrders,
      refundedOrders,
      refundRate:
        totalOrders > 0
          ? ((refundedOrders / totalOrders) * 100).toFixed(1)
          : "0.0",
      monthlyRevenue,
      packBreakdown,
      topEvents,
    });
  } catch (error) {
    console.error("Error fetching payment stats:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des statistiques" },
      { status: 500 }
    );
  }
}
