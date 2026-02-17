import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const event = await prisma.event.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, _count: { select: { photos: true } } },
  });

  if (!event) {
    return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
  }

  // Reset processing status for all photos in this event
  await prisma.photo.updateMany({
    where: { eventId: params.id },
    data: { processedAt: null, ocrProvider: null, faceIndexed: false, qualityScore: null, isBlurry: false },
  });

  return NextResponse.json({
    success: true,
    message: `Retraitement lancé pour ${event._count.photos} photos de "${event.name}"`,
    photosToReprocess: event._count.photos,
  });
}
