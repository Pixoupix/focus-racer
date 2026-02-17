import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  // Rate limit: 30 requests/minute per IP (event list)
  const limited = rateLimit(request, "events-list", { limit: 30 });
  if (limited) return limited;

  try {
    const events = await prisma.event.findMany({
      where: { status: "PUBLISHED" },
      include: {
        user: {
          select: { name: true },
        },
        _count: {
          select: { photos: true },
        },
      },
      orderBy: { date: "desc" },
    });

    // Only return events that have at least one photo
    const eventsWithPhotos = events.filter((event) => event._count.photos > 0);

    return NextResponse.json(eventsWithPhotos, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("Error fetching public events:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des événements" },
      { status: 500 }
    );
  }
}
