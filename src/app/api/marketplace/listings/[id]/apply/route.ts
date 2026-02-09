import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const applySchema = z.object({
  message: z.string().optional(),
  proposedRate: z.number().positive().optional(),
});

// POST: Apply to a listing (photographers only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    if (session.user.role !== "PHOTOGRAPHER") {
      return NextResponse.json(
        { error: "Seuls les photographes peuvent postuler" },
        { status: 403 }
      );
    }

    const { id: listingId } = await params;
    const body = await request.json();
    const data = applySchema.parse(body);

    // Verify listing exists and is open
    const listing = await prisma.marketplaceListing.findUnique({
      where: { id: listingId },
    });

    if (!listing || listing.status !== "OPEN") {
      return NextResponse.json({ error: "Annonce non disponible" }, { status: 400 });
    }

    // Can't apply to own listing
    if (listing.creatorId === session.user.id) {
      return NextResponse.json({ error: "Vous ne pouvez pas postuler à votre propre annonce" }, { status: 400 });
    }

    const application = await prisma.marketplaceApplication.create({
      data: {
        listingId,
        photographerId: session.user.id,
        message: data.message || null,
        proposedRate: data.proposedRate || null,
      },
      include: {
        photographer: {
          select: { id: true, name: true, company: true, avatar: true, avgRating: true },
        },
      },
    });

    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }

    // Unique constraint violation = already applied
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Vous avez déjà postulé à cette annonce" }, { status: 409 });
    }

    console.error("Apply error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
