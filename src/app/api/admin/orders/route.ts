import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status") || "";
    const search = searchParams.get("search") || "";
    const eventId = searchParams.get("eventId") || "";

    const where: Record<string, unknown> = {};

    if (status && status !== "all") {
      where.status = status;
    }

    if (eventId) {
      where.eventId = eventId;
    }

    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
        { guestEmail: { contains: search, mode: "insensitive" } },
        { guestName: { contains: search, mode: "insensitive" } },
        { id: { contains: search } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          event: {
            select: { id: true, name: true },
          },
          pack: {
            select: { name: true, type: true },
          },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching admin orders:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
