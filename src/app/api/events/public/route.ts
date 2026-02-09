import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
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

    return NextResponse.json(eventsWithPhotos);
  } catch (error) {
    console.error("Error fetching public events:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des événements" },
      { status: 500 }
    );
  }
}
