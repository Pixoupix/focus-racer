import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { credits: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  return NextResponse.json({
    credits: user.credits,
    isTestMode: user.credits > 99999,
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  const body = await request.json();
  const amount = parseInt(body.amount, 10);

  if (!amount || amount <= 0 || amount > 10000) {
    return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: session.user.id },
      select: { credits: true },
    });

    if (!user) throw new Error("User not found");

    const balanceBefore = user.credits;
    const balanceAfter = balanceBefore + amount;

    await tx.user.update({
      where: { id: session.user.id },
      data: { credits: balanceAfter },
    });

    const transaction = await tx.creditTransaction.create({
      data: {
        userId: session.user.id,
        type: "PURCHASE",
        amount,
        balanceBefore,
        balanceAfter,
        reason: `Achat de ${amount} credits`,
      },
    });

    return { credits: balanceAfter, transaction };
  });

  return NextResponse.json({
    credits: result.credits,
    transactionId: result.transaction.id,
  });
}
