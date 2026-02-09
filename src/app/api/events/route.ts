import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const createEventSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  date: z.string().min(1, "La date est requise"),
  location: z.string().optional(),
  description: z.string().optional(),
  sportType: z.enum(["RUNNING", "TRAIL", "TRIATHLON", "CYCLING", "SWIMMING", "OBSTACLE", "OTHER"]).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    const events = await prisma.event.findMany({
      where: { userId: session.user.id },
      include: {
        _count: {
          select: { photos: true, startListEntries: true, pricePacks: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des événements" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, date, location, description, sportType, status } = createEventSchema.parse(body);

    const event = await prisma.event.create({
      data: {
        name,
        date: new Date(date),
        location: location || null,
        description: description || null,
        sportType: sportType || "RUNNING",
        status: status || "DRAFT",
        userId: session.user.id,
      },
    });

    return NextResponse.json(event);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Error creating event:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de l'événement" },
      { status: 500 }
    );
  }
}
