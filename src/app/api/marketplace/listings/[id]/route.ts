import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

// GET: listing detail with applications
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    const listing = await prisma.marketplaceListing.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, name: true, company: true, role: true, avatar: true, avgRating: true, totalReviews: true },
        },
        applications: {
          include: {
            photographer: {
              select: { id: true, name: true, company: true, avatar: true, avgRating: true, totalReviews: true, bio: true, portfolio: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        _count: { select: { applications: true } },
      },
    });

    if (!listing) {
      return NextResponse.json({ error: "Annonce non trouvée" }, { status: 404 });
    }

    // Only show applications to the listing creator or admin
    const isCreator = session?.user?.id === listing.creatorId;
    const isAdmin = session?.user?.role === "ADMIN";

    if (!isCreator && !isAdmin) {
      // Hide other photographers' applications, only show own
      const ownApplication = listing.applications.find(
        (a) => a.photographerId === session?.user?.id
      );
      return NextResponse.json({
        ...listing,
        applications: ownApplication ? [ownApplication] : [],
      });
    }

    return NextResponse.json(listing);
  } catch (error) {
    console.error("Marketplace get error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PATCH: update listing status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const listing = await prisma.marketplaceListing.findUnique({
      where: { id },
    });

    if (!listing) {
      return NextResponse.json({ error: "Annonce non trouvée" }, { status: 404 });
    }

    if (listing.creatorId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const updated = await prisma.marketplaceListing.update({
      where: { id },
      data: {
        status: body.status,
        ...(body.title && { title: body.title }),
        ...(body.description && { description: body.description }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Marketplace update error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// DELETE
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;

    const listing = await prisma.marketplaceListing.findUnique({
      where: { id },
    });

    if (!listing) {
      return NextResponse.json({ error: "Annonce non trouvée" }, { status: 404 });
    }

    if (listing.creatorId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    await prisma.marketplaceListing.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Marketplace delete error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
