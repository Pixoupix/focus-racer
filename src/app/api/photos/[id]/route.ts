import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

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

    await prisma.photo.delete({ where: { id: photoId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting photo:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
