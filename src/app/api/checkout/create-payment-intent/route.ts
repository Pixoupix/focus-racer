import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { stripe, PLATFORM_FEE_PERCENT } from "@/lib/stripe";
import { calculateOptimalPricing } from "@/lib/pricing";

const paymentIntentSchema = z.object({
  eventId: z.string(),
  photoIds: z.array(z.string()).min(1, "Sélectionnez au moins une photo"),
  packId: z.string().nullable().optional(),
  guestEmail: z.string().email("Email invalide").optional(),
  guestName: z.string().min(1).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const data = paymentIntentSchema.parse(body);

    if (!session?.user && (!data.guestEmail || !data.guestName)) {
      return NextResponse.json(
        { error: "Email et nom requis pour les achats sans compte" },
        { status: 400 }
      );
    }

    const event = await prisma.event.findUnique({
      where: { id: data.eventId, status: "PUBLISHED" },
    });
    if (!event) {
      return NextResponse.json({ error: "Événement non trouvé" }, { status: 404 });
    }

    const photos = await prisma.photo.findMany({
      where: {
        id: { in: data.photoIds },
        eventId: data.eventId,
      },
    });
    if (photos.length !== data.photoIds.length) {
      return NextResponse.json(
        { error: "Certaines photos sont invalides" },
        { status: 400 }
      );
    }

    const packs = await prisma.pricePack.findMany({
      where: { eventId: data.eventId, isActive: true },
    });

    if (packs.length === 0) {
      return NextResponse.json(
        { error: "Aucun tarif disponible pour cet événement" },
        { status: 400 }
      );
    }

    // Server-side price calculation
    let totalAmount: number;
    let selectedPackId: string | null = null;

    if (data.packId) {
      const pack = packs.find((p) => p.id === data.packId);
      if (!pack) {
        return NextResponse.json({ error: "Pack non trouvé" }, { status: 400 });
      }

      if (pack.type === "ALL_INCLUSIVE") {
        totalAmount = pack.price;
        selectedPackId = pack.id;
      } else if (pack.quantity && photos.length >= pack.quantity) {
        totalAmount = pack.price;
        selectedPackId = pack.id;
      } else {
        const pricing = calculateOptimalPricing(photos.length, packs);
        totalAmount = pricing.totalPrice;
      }
    } else {
      const pricing = calculateOptimalPricing(photos.length, packs);
      totalAmount = pricing.totalPrice;
      if (pricing.packs.length === 1) {
        selectedPackId = pricing.packs[0].packId;
      }
    }

    if (totalAmount <= 0) {
      return NextResponse.json({ error: "Prix invalide" }, { status: 400 });
    }

    const platformFee = Math.round(totalAmount * PLATFORM_FEE_PERCENT) / 100;

    // Create order
    const order = await prisma.order.create({
      data: {
        userId: session?.user?.id || null,
        guestEmail: data.guestEmail || null,
        guestName: data.guestName || null,
        eventId: data.eventId,
        packId: selectedPackId,
        status: "PENDING",
        totalAmount,
        platformFee,
        items: {
          create: photos.map((photo) => ({
            photoId: photo.id,
            unitPrice: totalAmount / photos.length,
          })),
        },
      },
    });

    // Create PaymentIntent with automatic payment methods (card, Apple Pay, Google Pay, Link, etc.)
    const customerEmail = session?.user?.email || data.guestEmail || undefined;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // Stripe uses cents
      currency: "eur",
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        orderId: order.id,
        eventId: data.eventId,
        photoCount: photos.length.toString(),
      },
      receipt_email: customerEmail,
      description: `${photos.length} photo${photos.length > 1 ? "s" : ""} - ${event.name}`,
    });

    // Store the PaymentIntent ID on the order
    await prisma.order.update({
      where: { id: order.id },
      data: { stripeSessionId: paymentIntent.id },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      orderId: order.id,
      amount: totalAmount,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("PaymentIntent error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du paiement" },
      { status: 500 }
    );
  }
}
