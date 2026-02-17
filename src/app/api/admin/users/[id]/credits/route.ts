import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: { credits: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    const transactions = await prisma.creditTransaction.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ credits: user.credits, transactions });
  } catch (error) {
    console.error("Error fetching credits:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des crédits" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { amount, reason } = body;

    if (!amount || typeof amount !== "number" || amount === 0) {
      return NextResponse.json(
        { error: "Montant invalide" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id },
        select: { credits: true },
      });

      if (!user) throw new Error("User not found");

      const balanceBefore = user.credits;
      const balanceAfter = balanceBefore + amount;

      if (balanceAfter < 0) {
        throw new Error("Solde insuffisant");
      }

      await tx.user.update({
        where: { id },
        data: { credits: balanceAfter },
      });

      const transaction = await tx.creditTransaction.create({
        data: {
          userId: id,
          type: "ADMIN_GRANT",
          amount,
          balanceBefore,
          balanceAfter,
          reason: reason || (amount > 0 ? "Ajout admin" : "Retrait admin"),
        },
      });

      return { credits: balanceAfter, transaction };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error managing credits:", error);

    if (error.message === "Solde insuffisant") {
      return NextResponse.json(
        { error: "Solde insuffisant pour ce retrait" },
        { status: 400 }
      );
    }

    if (error.message === "User not found") {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Erreur lors de la modification des crédits" },
      { status: 500 }
    );
  }
}
