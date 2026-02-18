import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { s3KeyToPublicPath } from "@/lib/s3";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const sort = searchParams.get("sort") || "date";

    const where: Record<string, unknown> = {};

    if (status && status !== "all") {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } },
        { user: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const orderBy: Record<string, string> =
      sort === "name" ? { name: "asc" } :
      sort === "photos" ? { /* handled separately */ } :
      { date: "desc" };

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: {
              photos: true,
              startListEntries: true,
              orders: true,
            },
          },
        },
        orderBy: sort === "photos" ? { photos: { _count: "desc" } } : orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.event.count({ where }),
    ]);

    // Get revenue per event for the fetched events
    const eventIds = events.map((e) => e.id);
    const revenueByEvent = await prisma.order.groupBy({
      by: ["eventId"],
      where: {
        eventId: { in: eventIds },
        status: "PAID",
      },
      _sum: { totalAmount: true, platformFee: true },
      _count: true,
    });

    const revenueMap = revenueByEvent.reduce(
      (acc, item) => {
        acc[item.eventId] = {
          revenue: item._sum.totalAmount || 0,
          platformFee: item._sum.platformFee || 0,
          paidOrders: item._count,
        };
        return acc;
      },
      {} as Record<string, { revenue: number; platformFee: number; paidOrders: number }>
    );

    // Get top bibs per event
    const topBibs = await prisma.$queryRaw<
      { eventId: string; number: string; photoCount: number }[]
    >`
      SELECT
        p."eventId",
        bn."number",
        COUNT(DISTINCT bn."photoId")::int as "photoCount"
      FROM "BibNumber" bn
      JOIN "Photo" p ON p.id = bn."photoId"
      WHERE p."eventId" = ANY(${eventIds})
      GROUP BY p."eventId", bn."number"
      ORDER BY "photoCount" DESC
    `;

    const topBibsMap: Record<string, { number: string; photoCount: number }[]> = {};
    for (const bib of topBibs) {
      if (!topBibsMap[bib.eventId]) topBibsMap[bib.eventId] = [];
      if (topBibsMap[bib.eventId].length < 3) {
        topBibsMap[bib.eventId].push({ number: bib.number, photoCount: bib.photoCount });
      }
    }

    const enrichedEvents = events.map((event) => ({
      id: event.id,
      name: event.name,
      date: event.date,
      location: event.location,
      sportType: event.sportType,
      status: event.status,
      coverImage: event.coverImage ? s3KeyToPublicPath(event.coverImage) : null,
      user: event.user,
      photoCount: event._count.photos,
      runnerCount: event._count.startListEntries,
      orderCount: event._count.orders,
      revenue: revenueMap[event.id]?.revenue || 0,
      platformFee: revenueMap[event.id]?.platformFee || 0,
      paidOrders: revenueMap[event.id]?.paidOrders || 0,
      topBibs: topBibsMap[event.id] || [],
    }));

    return NextResponse.json({
      events: enrichedEvents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching admin events:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
