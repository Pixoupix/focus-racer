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
    });

    if (!event) {
      return NextResponse.json({ error: "Événement non trouvé" }, { status: 404 });
    }

    const packs = await prisma.pricePack.findMany({
      where: { eventId: id, isActive: true },
      orderBy: { price: "asc" },
      select: {
        id: true,
        name: true,
        type: true,
        price: true,
        quantity: true,
      },
    });

    return NextResponse.json(packs);
  } catch (error) {
    console.error("Error fetching public packs:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
