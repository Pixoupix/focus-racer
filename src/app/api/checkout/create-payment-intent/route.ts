import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getStripe, SERVICE_FEE_CENTS, SERVICE_FEE_EUR } from "@/lib/stripe";
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
      include: {
        user: {
          select: { id: true, stripeAccountId: true, stripeOnboarded: true },
        },
      },
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

    // Check if the photographer has a connected Stripe account
    const photographerConnected =
      !!event.user.stripeAccountId && event.user.stripeOnboarded;

    // Service fee: 1€ added to the runner's total when photographer is connected
    const serviceFee = photographerConnected ? SERVICE_FEE_EUR : 0;
    const totalForRunner = totalAmount + serviceFee;

    // Create order
    const order = await prisma.order.create({
      data: {
        userId: session?.user?.id || null,
        guestEmail: data.guestEmail || null,
        guestName: data.guestName || null,
        eventId: data.eventId,
        packId: selectedPackId,
        status: "PENDING",
        totalAmount: totalForRunner,
        platformFee: serviceFee,
        serviceFee,
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
    const stripe = getStripe();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const piParams: any = {
      amount: Math.round(totalForRunner * 100), // Stripe uses cents
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
    };

    // If photographer is connected, use Connect with transfer_data
    if (photographerConnected) {
      piParams.transfer_data = {
        destination: event.user.stripeAccountId,
      };
      piParams.application_fee_amount = SERVICE_FEE_CENTS;
    }

    const paymentIntent = await stripe.paymentIntents.create(piParams);

    // Store the PaymentIntent ID on the order
    await prisma.order.update({
      where: { id: order.id },
      data: { stripeSessionId: paymentIntent.id },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      orderId: order.id,
      amount: totalForRunner,
      photoPrice: totalAmount,
      serviceFee,
      photographerConnected,
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
