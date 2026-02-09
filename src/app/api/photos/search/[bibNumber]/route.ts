import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bibNumber: string }> }
) {
  try {
    const { bibNumber } = await params;
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");

    if (!bibNumber) {
      return NextResponse.json(
        { error: "Numéro de dossard requis" },
        { status: 400 }
      );
    }

    const whereClause: {
      number: string;
      photo?: { eventId: string };
    } = {
      number: bibNumber,
    };

    if (eventId) {
      whereClause.photo = { eventId };
    }

    const bibNumbers = await prisma.bibNumber.findMany({
      where: whereClause,
      include: {
        photo: {
          include: {
            event: {
              select: {
                id: true,
                name: true,
                date: true,
                location: true,
              },
            },
            bibNumbers: true,
          },
        },
      },
    });

    // Extract unique photos
    const photosMap = new Map();
    bibNumbers.forEach((bib) => {
      if (!photosMap.has(bib.photo.id)) {
        photosMap.set(bib.photo.id, {
          ...bib.photo,
          event: bib.photo.event,
        });
      }
    });

    const photos = Array.from(photosMap.values());

    return NextResponse.json({
      bibNumber,
      count: photos.length,
      photos,
    });
  } catch (error) {
    console.error("Error searching photos:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recherche" },
      { status: 500 }
    );
  }
}
