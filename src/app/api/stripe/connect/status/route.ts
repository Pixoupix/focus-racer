import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeAccountId: true, stripeOnboarded: true },
    });

    if (!user?.stripeAccountId) {
      return NextResponse.json({
        hasAccount: false,
        isOnboarded: false,
        chargesEnabled: false,
        payoutsEnabled: false,
      });
    }

    const stripe = getStripe();
    const account = await stripe.accounts.retrieve(user.stripeAccountId);

    const chargesEnabled = account.charges_enabled ?? false;
    const payoutsEnabled = account.payouts_enabled ?? false;
    const isOnboarded = chargesEnabled && payoutsEnabled;

    // Update DB if newly onboarded
    if (isOnboarded && !user.stripeOnboarded) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { stripeOnboarded: true },
      });
    }

    return NextResponse.json({
      hasAccount: true,
      isOnboarded,
      chargesEnabled,
      payoutsEnabled,
    });
  } catch (error) {
    console.error("Stripe Connect status error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la vérification du statut" },
      { status: 500 }
    );
  }
}
