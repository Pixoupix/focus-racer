import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStripe, APP_URL } from "@/lib/stripe";
import prisma from "@/lib/prisma";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, name: true, stripeAccountId: true, role: true },
    });

    if (!user || !["PHOTOGRAPHER", "ORGANIZER", "AGENCY", "CLUB", "FEDERATION"].includes(user.role)) {
      return NextResponse.json({ error: "Rôle non autorisé" }, { status: 403 });
    }

    const stripe = getStripe();
    let accountId = user.stripeAccountId;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "FR",
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: "individual",
        metadata: { userId: user.id },
      });

      accountId = account.id;

      await prisma.user.update({
        where: { id: user.id },
        data: { stripeAccountId: accountId },
      });
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${APP_URL}/photographer/credits`,
      return_url: `${APP_URL}/photographer/credits?stripe=complete`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error("Stripe Connect onboarding error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la configuration Stripe" },
      { status: 500 }
    );
  }
}
