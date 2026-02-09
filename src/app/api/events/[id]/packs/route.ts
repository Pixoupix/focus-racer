import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const createPackSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  type: z.enum(["SINGLE", "PACK_5", "PACK_10", "ALL_INCLUSIVE"]),
  price: z.number().min(0, "Le prix doit être positif"),
  quantity: z.number().int().min(1).optional().nullable(),
});

const updatePackSchema = createPackSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event || (event.userId !== session.user.id && session.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const packs = await prisma.pricePack.findMany({
      where: { eventId: id },
      orderBy: { price: "asc" },
    });

    return NextResponse.json(packs);
  } catch (error) {
    console.error("Error fetching packs:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event || (event.userId !== session.user.id && session.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const body = await request.json();
    const data = createPackSchema.parse(body);

    const pack = await prisma.pricePack.create({
      data: {
        ...data,
        eventId: id,
      },
    });

    return NextResponse.json(pack);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Error creating pack:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const { packId, ...data } = body;
    const validated = updatePackSchema.parse(data);

    const pack = await prisma.pricePack.findUnique({
      where: { id: packId },
      include: { event: true },
    });

    if (!pack || pack.eventId !== id || (pack.event.userId !== session.user.id && session.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const updated = await prisma.pricePack.update({
      where: { id: packId },
      data: validated,
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Error updating pack:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { packId } = await request.json();

    const pack = await prisma.pricePack.findUnique({
      where: { id: packId },
      include: { event: true },
    });

    if (!pack || pack.eventId !== id || (pack.event.userId !== session.user.id && session.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    await prisma.pricePack.delete({ where: { id: packId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting pack:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
