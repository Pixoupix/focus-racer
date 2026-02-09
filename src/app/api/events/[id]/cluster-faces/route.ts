import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { clusterFacesByEvent, getClusteringStats, eventNeedsClustering } from "@/lib/face-clustering";

/**
 * GET: Get clustering status/stats for an event
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const { id: eventId } = params;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json({ error: "Evenement non trouve" }, { status: 404 });
    }

    if (event.userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorise" }, { status: 403 });
    }

    const [stats, needsClustering] = await Promise.all([
      getClusteringStats(eventId),
      eventNeedsClustering(eventId),
    ]);

    return NextResponse.json({
      ...stats,
      needsClustering,
    });
  } catch (error) {
    console.error("Clustering stats error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation des statistiques" },
      { status: 500 }
    );
  }
}

/**
 * POST: Trigger face clustering for an event
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const { id: eventId } = params;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json({ error: "Evenement non trouve" }, { status: 404 });
    }

    if (event.userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorise" }, { status: 403 });
    }

    console.log(`[API] Starting face clustering for event ${eventId}`);

    const stats = await clusterFacesByEvent(eventId);

    return NextResponse.json({
      success: true,
      message: `Clustering termine. ${stats.photosLinked} photos liees, ${stats.newBibsAssigned} dossards assignes.`,
      stats,
    });
  } catch (error) {
    console.error("Clustering error:", error);
    return NextResponse.json(
      { error: "Erreur lors du clustering" },
      { status: 500 }
    );
  }
}
