import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { s3KeyToPublicPath } from "@/lib/s3";

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

    const mapped = eventsWithPhotos.map((e) => ({
      ...e,
      coverImage: e.coverImage ? s3KeyToPublicPath(e.coverImage) : null,
      bannerImage: e.bannerImage ? s3KeyToPublicPath(e.bannerImage) : null,
      logoImage: e.logoImage ? s3KeyToPublicPath(e.logoImage) : null,
    }));

    return NextResponse.json(mapped, {
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
