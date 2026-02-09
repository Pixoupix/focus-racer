import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { randomBytes } from "crypto";

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

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json({ error: "Commande non trouvée" }, { status: 404 });
    }

    if (order.userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    if (order.status !== "PAID") {
      return NextResponse.json(
        { error: "Seules les commandes payées peuvent être re-téléchargées" },
        { status: 400 }
      );
    }

    // Generate new token with 72h expiry
    const downloadToken = randomBytes(32).toString("hex");
    const downloadExpiresAt = new Date();
    downloadExpiresAt.setHours(downloadExpiresAt.getHours() + 72);

    const updated = await prisma.order.update({
      where: { id },
      data: { downloadToken, downloadExpiresAt },
    });

    return NextResponse.json({
      downloadToken: updated.downloadToken,
      downloadExpiresAt: updated.downloadExpiresAt,
    });
  } catch (error) {
    console.error("Error regenerating token:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
