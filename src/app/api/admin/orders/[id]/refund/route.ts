import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Read body (reason is stored for logging purposes)
    await request.json();

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        event: { select: { name: true } },
        user: { select: { name: true, email: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Commande non trouvée" }, { status: 404 });
    }

    if (order.status !== "PAID") {
      return NextResponse.json(
        { error: "Seules les commandes payées peuvent être remboursées" },
        { status: 400 }
      );
    }

    // Attempt Stripe refund if we have a payment intent
    let stripeRefundId: string | null = null;
    if (order.stripePaymentId) {
      try {
        const refund = await stripe.refunds.create({
          payment_intent: order.stripePaymentId,
          reason: "requested_by_customer",
        });
        stripeRefundId = refund.id;
      } catch (stripeErr) {
        console.error("Stripe refund error:", stripeErr);
        return NextResponse.json(
          { error: "Erreur lors du remboursement Stripe. Vérifiez le paiement dans le dashboard Stripe." },
          { status: 500 }
        );
      }
    }

    // Update order status
    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: "REFUNDED",
        downloadToken: null,
        downloadExpiresAt: null,
      },
    });

    return NextResponse.json({
      success: true,
      orderId: updated.id,
      stripeRefundId,
      message: stripeRefundId
        ? "Remboursement effectué via Stripe"
        : "Commande marquée comme remboursée (pas de paiement Stripe associé)",
    });
  } catch (error) {
    console.error("Refund error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
