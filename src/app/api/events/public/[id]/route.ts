import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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
        },
        _count: {
          select: { photos: true, startListEntries: true },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Événement non trouvé" }, { status: 404 });
    }

    // Return watermarked thumbnails instead of originals for public gallery
    const photosPublic = event.photos.map((photo) => ({
      id: photo.id,
      // Use watermarked thumbnail > web-optimized > HD original (last resort)
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
    });
  } catch (error) {
    console.error("Error fetching public event:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
