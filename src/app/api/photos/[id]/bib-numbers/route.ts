import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

// Add a bib number to a photo
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: photoId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      include: { event: true },
    });

    if (!photo || (photo.event.userId !== session.user.id && session.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const { number } = await request.json();
    if (!number || typeof number !== "string") {
      return NextResponse.json({ error: "Numéro de dossard requis" }, { status: 400 });
    }

    const bib = await prisma.bibNumber.create({
      data: {
        number: number.trim(),
        photoId,
        confidence: 1.0, // Manual assignment = full confidence
      },
    });

    return NextResponse.json(bib);
  } catch (error) {
    console.error("Error adding bib number:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// Remove a bib number from a photo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: photoId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      include: { event: true },
    });

    if (!photo || (photo.event.userId !== session.user.id && session.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const { bibId } = await request.json();
    if (!bibId) {
      return NextResponse.json({ error: "ID du dossard requis" }, { status: 400 });
    }

    await prisma.bibNumber.delete({ where: { id: bibId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing bib number:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
