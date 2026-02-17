import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user || !["AGENCY", "FEDERATION"].includes(user.role)) {
    return NextResponse.json(
      { error: "Accès réservé aux agences et fédérations" },
      { status: 403 }
    );
  }

  // For AGENCY: get photographers from accepted marketplace applications
  if (user.role === "AGENCY") {
    const listings = await prisma.marketplaceListing.findMany({
      where: { creatorId: session.user.id },
      include: {
        applications: {
          where: { status: "ACCEPTED" },
          include: {
            photographer: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                portfolio: true,
                avgRating: true,
                totalReviews: true,
                company: true,
                location: true,
                city: true,
                _count: { select: { events: true } },
              },
            },
          },
        },
      },
    });

    // Deduplicate photographers across listings
    const photographerMap = new Map();
    listings.forEach((listing) => {
      listing.applications.forEach((app) => {
        if (!photographerMap.has(app.photographer.id)) {
          photographerMap.set(app.photographer.id, {
            ...app.photographer,
            listingCount: 1,
          });
        } else {
          photographerMap.get(app.photographer.id).listingCount++;
        }
      });
    });

    return NextResponse.json({
      team: Array.from(photographerMap.values()),
      totalListings: listings.length,
    });
  }

  // For FEDERATION: get clubs
  // Clubs are users with CLUB role - in this MVP, federation manages clubs by listing them
  // We use a simple approach: fetch all CLUB users (in production, add a federationId field)
  const clubs = await prisma.user.findMany({
    where: { role: "CLUB" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      company: true,
      location: true,
      city: true,
      isActive: true,
      _count: { select: { events: true } },
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ team: clubs });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user || !["AGENCY", "FEDERATION"].includes(user.role)) {
    return NextResponse.json(
      { error: "Accès réservé aux agences et fédérations" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { email } = body;

  if (!email) {
    return NextResponse.json({ error: "Email requis" }, { status: 400 });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json(
      { error: "Format d'email invalide" },
      { status: 400 }
    );
  }

  // Check if user exists
  const targetUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, role: true },
  });

  if (!targetUser) {
    return NextResponse.json(
      { error: "Aucun utilisateur trouvé avec cet email" },
      { status: 404 }
    );
  }

  // For AGENCY: target must be a PHOTOGRAPHER
  if (user.role === "AGENCY" && targetUser.role !== "PHOTOGRAPHER") {
    return NextResponse.json(
      { error: "Cet utilisateur n'est pas un photographe" },
      { status: 400 }
    );
  }

  // For FEDERATION: target must be a CLUB
  if (user.role === "FEDERATION" && targetUser.role !== "CLUB") {
    return NextResponse.json(
      { error: "Cet utilisateur n'est pas un club" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    message: `${targetUser.name} a été trouvé. Utilisez la marketplace pour créer une mission.`,
    user: { id: targetUser.id, name: targetUser.name, role: targetUser.role },
  });
}
