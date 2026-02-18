import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        company: true,
        isActive: true,
        credits: true,
        stripeAccountId: true,
        stripeOnboarded: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            events: true,
            orders: true,
            creditTransactions: true,
            supportMessages: true,
          },
        },
        events: {
          select: {
            id: true,
            name: true,
            date: true,
            _count: { select: { photos: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouve" },
        { status: 404 }
      );
    }

    // Calculate total revenue from paid orders associated with this user's events
    const revenueResult = await prisma.order.aggregate({
      where: {
        event: { userId: id },
        status: "PAID",
      },
      _sum: { totalAmount: true },
    });

    // Calculate total photos across all events
    const photosResult = await prisma.photo.count({
      where: {
        event: { userId: id },
      },
    });

    // Count orders placed by this user (as buyer)
    const buyerOrdersResult = await prisma.order.aggregate({
      where: {
        userId: id,
        status: "PAID",
      },
      _sum: { totalAmount: true },
      _count: true,
    });

    return NextResponse.json({
      ...user,
      totalRevenue: revenueResult._sum.totalAmount || 0,
      totalPhotos: photosResult,
      buyerOrdersCount: buyerOrdersResult._count || 0,
      buyerTotalSpent: buyerOrdersResult._sum.totalAmount || 0,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation de l'utilisateur" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const data: Record<string, unknown> = {};
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;
    if (body.role) data.role = body.role;
    if (typeof body.name === "string") data.name = body.name;
    if (typeof body.email === "string") data.email = body.email;
    if (typeof body.phone === "string") data.phone = body.phone || null;
    if (typeof body.company === "string") data.company = body.company || null;

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise a jour" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const hard = searchParams.get("hard") === "true";

    if (hard) {
      // Hard delete: cascade all related data in correct order
      await prisma.$transaction(async (tx) => {
        // Get user's event IDs
        const eventIds = (
          await tx.event.findMany({
            where: { userId: id },
            select: { id: true },
          })
        ).map((e) => e.id);

        // 1. OrderItems (references Order + Photo, no cascade)
        if (eventIds.length > 0) {
          await tx.orderItem.deleteMany({
            where: {
              OR: [
                { order: { eventId: { in: eventIds } } },
                { order: { userId: id } },
              ],
            },
          });
        } else {
          await tx.orderItem.deleteMany({
            where: { order: { userId: id } },
          });
        }

        // 2. Orders (on user's events + buyer orders)
        await tx.order.deleteMany({
          where: {
            OR: [
              ...(eventIds.length > 0
                ? [{ eventId: { in: eventIds } }]
                : []),
              { userId: id },
            ],
          },
        });

        // 3. Events (cascades: Photos→BibNumbers+PhotoFaces, StartListEntries, PricePacks)
        if (eventIds.length > 0) {
          await tx.event.deleteMany({ where: { userId: id } });
        }

        // 4. Marketplace
        await tx.marketplaceApplication.deleteMany({ where: { photographerId: id } });
        await tx.marketplaceListing.deleteMany({ where: { creatorId: id } });
        await tx.marketplaceReview.deleteMany({
          where: { OR: [{ authorId: id }, { targetId: id }] },
        });

        // 5. Credits & support
        await tx.creditTransaction.deleteMany({ where: { userId: id } });
        await tx.supportMessage.deleteMany({ where: { userId: id } });

        // 6. User
        await tx.user.delete({ where: { id } });
      });
    } else {
      await prisma.user.update({
        where: { id },
        data: { isActive: false },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression" },
      { status: 500 }
    );
  }
}
