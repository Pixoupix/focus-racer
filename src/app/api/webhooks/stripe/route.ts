import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import prisma from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { randomBytes } from "crypto";
import { sendPurchaseConfirmation } from "@/lib/email";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Helper to fulfill an order (shared by checkout.session.completed and payment_intent.succeeded)
  async function fulfillOrder(orderId: string, paymentId: string) {
    const existing = await prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!existing || existing.status !== "PENDING") {
      return; // Already processed or not found
    }

    const downloadToken = randomBytes(32).toString("hex");
    const downloadExpiresAt = new Date();
    downloadExpiresAt.setHours(downloadExpiresAt.getHours() + 72);

    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "PAID",
        stripePaymentId: paymentId,
        downloadToken,
        downloadExpiresAt,
      },
      include: {
        event: true,
        items: { include: { photo: true } },
        user: true,
      },
    });

    const recipientEmail = order.user?.email || order.guestEmail;
    const recipientName = order.user?.name || order.guestName || "Client";

    if (recipientEmail) {
      try {
        await sendPurchaseConfirmation({
          to: recipientEmail,
          name: recipientName,
          orderId: order.id,
          eventName: order.event.name,
          photoCount: order.items.length,
          totalAmount: order.totalAmount,
          downloadToken: order.downloadToken!,
          expiresAt: order.downloadExpiresAt!,
        });
      } catch (emailErr) {
        console.error("Failed to send confirmation email:", emailErr);
      }
    }
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;
      if (!orderId) {
        console.error("No orderId in session metadata");
        break;
      }
      await fulfillOrder(orderId, session.payment_intent as string);
      break;
    }

    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const orderId = paymentIntent.metadata?.orderId;
      if (!orderId) {
        break; // Not our payment intent
      }
      await fulfillOrder(orderId, paymentIntent.id);
      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;
      if (orderId) {
        await prisma.order.updateMany({
          where: { id: orderId, status: "PENDING" },
          data: { status: "EXPIRED" },
        });
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
