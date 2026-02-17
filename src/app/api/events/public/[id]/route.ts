import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

const PAGE_SIZE = 100;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate limit: 60 requests/minute per IP
  const limited = rateLimit(request, "events-public", { limit: 60 });
  if (limited) return limited;

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor"); // photo ID for cursor-based pagination
    const limit = Math.min(parseInt(searchParams.get("limit") || String(PAGE_SIZE), 10), 200);

    const event = await prisma.event.findUnique({
      where: { id, status: "PUBLISHED" },
      include: {
        user: {
          select: { name: true },
        },
        photos: {
          select: {
            id: true,
            thumbnailPath: true,
            webPath: true,
            path: true,
            originalName: true,
            createdAt: true,
            bibNumbers: {
              select: { id: true, number: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: limit + 1, // Fetch one extra to detect if there are more
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        },
        _count: {
          select: { photos: true, startListEntries: true },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Événement non trouvé" }, { status: 404 });
    }

    const hasMore = event.photos.length > limit;
    const photos = hasMore ? event.photos.slice(0, limit) : event.photos;
    const nextCursor = hasMore ? photos[photos.length - 1].id : null;

    const photosPublic = photos.map((photo) => ({
      id: photo.id,
      src: photo.thumbnailPath || photo.webPath || photo.path,
      originalName: photo.originalName,
      bibNumbers: photo.bibNumbers,
      createdAt: photo.createdAt,
    }));

    return NextResponse.json({
      id: event.id,
      name: event.name,
      date: event.date,
      location: event.location,
      description: event.description,
      sportType: event.sportType,
      coverImage: event.coverImage,
      bannerImage: event.bannerImage,
      logoImage: event.logoImage,
      primaryColor: event.primaryColor,
      photographer: event.user.name,
      photoCount: event._count.photos,
      runnerCount: event._count.startListEntries,
      photos: photosPublic,
      nextCursor,
      hasMore,
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("Error fetching public event:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
