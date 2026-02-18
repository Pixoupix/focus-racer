import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import prisma from "@/lib/prisma";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeAccountId: true, stripeOnboarded: true },
    });

    if (!user?.stripeAccountId || !user.stripeOnboarded) {
      return NextResponse.json(
        { error: "Compte Stripe non configuré" },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const loginLink = await stripe.accounts.createLoginLink(user.stripeAccountId);

    return NextResponse.json({ url: loginLink.url });
  } catch (error) {
    console.error("Stripe Connect dashboard error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération du lien" },
      { status: 500 }
    );
  }
}
