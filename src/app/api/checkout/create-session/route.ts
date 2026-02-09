import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { stripe, PLATFORM_FEE_PERCENT, APP_URL } from "@/lib/stripe";
import { calculateOptimalPricing } from "@/lib/pricing";

const checkoutSchema = z.object({
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
    const data = checkoutSchema.parse(body);

    // Guest checkout requires email + name
    if (!session?.user && (!data.guestEmail || !data.guestName)) {
      return NextResponse.json(
        { error: "Email et nom requis pour les achats sans compte" },
        { status: 400 }
      );
    }

    // Verify event exists and is published
    const event = await prisma.event.findUnique({
      where: { id: data.eventId, status: "PUBLISHED" },
    });
    if (!event) {
      return NextResponse.json({ error: "Événement non trouvé" }, { status: 404 });
    }

    // Verify all photos exist and belong to this event
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

    // Get active packs for this event
    const packs = await prisma.pricePack.findMany({
      where: { eventId: data.eventId, isActive: true },
    });

    if (packs.length === 0) {
      return NextResponse.json(
        { error: "Aucun tarif disponible pour cet événement" },
        { status: 400 }
      );
    }

    // Server-side price calculation (never trust client)
    let totalAmount: number;
    let selectedPackId: string | null = null;

    if (data.packId) {
      // Specific pack selected
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
        // Fall back to optimal pricing
        const pricing = calculateOptimalPricing(photos.length, packs);
        totalAmount = pricing.totalPrice;
      }
    } else {
      // Auto-optimal pricing
      const pricing = calculateOptimalPricing(photos.length, packs);
      totalAmount = pricing.totalPrice;
      if (pricing.packs.length === 1) {
        selectedPackId = pricing.packs[0].packId;
      }
    }

    if (totalAmount <= 0) {
      return NextResponse.json(
        { error: "Prix invalide" },
        { status: 400 }
      );
    }

    // Calculate platform fee
    const platformFee = Math.round(totalAmount * PLATFORM_FEE_PERCENT) / 100;

    // Create order in DB
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

    // Create Stripe Checkout Session
    const customerEmail =
      session?.user?.email || data.guestEmail || undefined;

    const stripeSession = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: customerEmail,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Photos - ${event.name}`,
              description: `${photos.length} photo${photos.length > 1 ? "s" : ""} HD`,
            },
            unit_amount: Math.round(totalAmount * 100), // Stripe uses cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        orderId: order.id,
        eventId: data.eventId,
        photoCount: photos.length.toString(),
      },
      success_url: `${APP_URL}/events/${data.eventId}/checkout/success?order=${order.id}`,
      cancel_url: `${APP_URL}/events/${data.eventId}/checkout/cancel`,
    });

    // Update order with Stripe session ID
    await prisma.order.update({
      where: { id: order.id },
      data: { stripeSessionId: stripeSession.id },
    });

    return NextResponse.json({ sessionUrl: stripeSession.url });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du paiement" },
      { status: 500 }
    );
  }
}
