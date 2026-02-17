import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      _count: { select: { photos: true, startListEntries: true, orders: true, pricePacks: true } },
      photos: {
        take: 5,
        orderBy: { createdAt: "desc" },
        select: { id: true, thumbnailPath: true, webPath: true, qualityScore: true, ocrProvider: true, faceIndexed: true, isBlurry: true },
      },
    },
  });

  if (!event) {
    return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
  }

  // Get revenue data
  const revenue = await prisma.order.aggregate({
    where: { eventId: params.id, status: "PAID" },
    _sum: { totalAmount: true, platformFee: true },
    _count: true,
  });

  // Get photo processing stats
  const photoStats = await prisma.photo.groupBy({
    by: ["ocrProvider"],
    where: { eventId: params.id },
    _count: true,
  });

  const processedCount = await prisma.photo.count({
    where: { eventId: params.id, processedAt: { not: null } },
  });

  const bibCount = await prisma.bibNumber.count({
    where: { photo: { eventId: params.id } },
  });

  return NextResponse.json({
    ...event,
    revenue: {
      total: revenue._sum.totalAmount || 0,
      platformFees: revenue._sum.platformFee || 0,
      paidOrders: revenue._count,
    },
    photoStats: {
      processed: processedCount,
      byProvider: photoStats,
      totalBibs: bibCount,
    },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await request.json();
  const { status } = body;

  if (status && !["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }

  const event = await prisma.event.update({
    where: { id: params.id },
    data: { ...(status && { status }) },
  });

  return NextResponse.json(event);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  // Check if event has paid orders
  const paidOrders = await prisma.order.count({
    where: { eventId: params.id, status: "PAID" },
  });

  if (paidOrders > 0) {
    return NextResponse.json({
      error: `Impossible de supprimer : ${paidOrders} commande(s) payée(s) liée(s) à cet événement`,
    }, { status: 400 });
  }

  await prisma.event.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
