import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const listingSchema = z.object({
  title: z.string().min(5, "Titre trop court (5 caractères min)"),
  description: z.string().min(10, "Description trop courte"),
  sportType: z.string().default("RUNNING"),
  eventDate: z.string(),
  eventLocation: z.string().min(2, "Lieu requis"),
  budget: z.number().positive().nullable().optional(),
  requirements: z.string().optional(),
});

// GET: List all open marketplace listings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sport = searchParams.get("sport");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 20;

    const where: Record<string, unknown> = { status: "OPEN" };
    if (sport && sport !== "all") {
      where.sportType = sport;
    }

    const [listings, total] = await Promise.all([
      prisma.marketplaceListing.findMany({
        where,
        include: {
          creator: {
            select: { id: true, name: true, company: true, role: true, avatar: true },
          },
          _count: { select: { applications: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.marketplaceListing.count({ where }),
    ]);

    return NextResponse.json({
      listings,
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Marketplace list error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST: Create a new listing (organizers only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Only organizers, agencies, clubs, federations can create listings
    const allowedRoles = ["ORGANIZER", "AGENCY", "CLUB", "FEDERATION", "ADMIN"];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json(
        { error: "Seuls les organisateurs peuvent créer des annonces" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const data = listingSchema.parse(body);

    const listing = await prisma.marketplaceListing.create({
      data: {
        title: data.title,
        description: data.description,
        sportType: data.sportType as "RUNNING" | "TRAIL" | "TRIATHLON" | "CYCLING" | "SWIMMING" | "OBSTACLE" | "OTHER",
        eventDate: new Date(data.eventDate),
        eventLocation: data.eventLocation,
        budget: data.budget || null,
        requirements: data.requirements || null,
        creatorId: session.user.id,
      },
      include: {
        creator: {
          select: { id: true, name: true, company: true },
        },
      },
    });

    return NextResponse.json(listing, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Marketplace create error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
