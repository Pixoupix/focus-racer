import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { aiConfig } from "@/lib/ai-config";
import { searchFaceByImage } from "@/lib/rekognition";

export async function POST(request: NextRequest) {
  try {
    if (!aiConfig.faceIndexEnabled) {
      return NextResponse.json(
        { error: "La recherche par selfie n'est pas activée" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("selfie") as File | null;
    const eventId = formData.get("eventId") as string | null;

    if (!file || !eventId) {
      return NextResponse.json(
        { error: "Selfie et eventId requis" },
        { status: 400 }
      );
    }

    // Verify event is published
    const event = await prisma.event.findUnique({
      where: { id: eventId, status: "PUBLISHED" },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Événement non trouvé" },
        { status: 404 }
      );
    }

    // Convert file to buffer and search
    const buffer = Buffer.from(await file.arrayBuffer());
    const matches = await searchFaceByImage(buffer, 50, 70);

    if (matches.length === 0) {
      return NextResponse.json({
        query: "selfie",
        type: "face",
        count: 0,
        photos: [],
        message: "Aucune correspondance trouvée. Essayez avec une photo plus nette.",
      });
    }

    // ExternalImageId format: "eventId:photoId"
    // Filter to photos from this event
    const photoIds = matches
      .filter((m) => m.externalImageId.startsWith(`${eventId}:`))
      .map((m) => m.externalImageId.split(":")[1]);

    if (photoIds.length === 0) {
      return NextResponse.json({
        query: "selfie",
        type: "face",
        count: 0,
        photos: [],
        message: "Aucune correspondance dans cet événement.",
      });
    }

    const photos = await prisma.photo.findMany({
      where: {
        id: { in: photoIds },
        eventId,
      },
      select: {
        id: true,
        thumbnailPath: true,
        webPath: true,
        path: true,
        originalName: true,
        bibNumbers: { select: { id: true, number: true } },
      },
    });

    return NextResponse.json({
      query: "selfie",
      type: "face",
      count: photos.length,
      photos: photos.map((p) => ({
        id: p.id,
        src: p.thumbnailPath || p.webPath || p.path,
        originalName: p.originalName,
        bibNumbers: p.bibNumbers,
      })),
    });
  } catch (error) {
    console.error("Face search error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recherche par selfie" },
      { status: 500 }
    );
  }
}
