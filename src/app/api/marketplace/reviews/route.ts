import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const reviewSchema = z.object({
  targetId: z.string(),
  listingId: z.string().optional(),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const data = reviewSchema.parse(body);

    if (data.targetId === session.user.id) {
      return NextResponse.json({ error: "Vous ne pouvez pas vous évaluer vous-même" }, { status: 400 });
    }

    const review = await prisma.marketplaceReview.create({
      data: {
        authorId: session.user.id,
        targetId: data.targetId,
        listingId: data.listingId || null,
        rating: data.rating,
        comment: data.comment || null,
      },
    });

    // Update target's average rating
    const allReviews = await prisma.marketplaceReview.findMany({
      where: { targetId: data.targetId },
      select: { rating: true },
    });

    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await prisma.user.update({
      where: { id: data.targetId },
      data: {
        avgRating: Math.round(avgRating * 10) / 10,
        totalReviews: allReviews.length,
      },
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Review error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// GET: Reviews for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId requis" }, { status: 400 });
    }

    const reviews = await prisma.marketplaceReview.findMany({
      where: { targetId: userId },
      include: {
        author: {
          select: { id: true, name: true, company: true, avatar: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(reviews);
  } catch (error) {
    console.error("Reviews list error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
