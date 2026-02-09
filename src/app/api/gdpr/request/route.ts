import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

const gdprRequestSchema = z.object({
  type: z.enum(["DELETION", "ACCESS", "RECTIFICATION"]).default("DELETION"),
  email: z.string().email("Email invalide"),
  name: z.string().min(1, "Nom requis"),
  bibNumber: z.string().optional(),
  eventId: z.string().optional(),
  reason: z.string().optional(),
});

// Public endpoint - no auth required
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = gdprRequestSchema.parse(body);

    // Check for duplicate pending requests
    const existing = await prisma.gdprRequest.findFirst({
      where: {
        email: data.email,
        status: { in: ["PENDING", "PROCESSING"] },
        type: data.type,
      },
    });

    if (existing) {
      return NextResponse.json({
        message: "Une demande similaire est déjà en cours de traitement.",
        requestId: existing.id,
      });
    }

    const gdprRequest = await prisma.gdprRequest.create({
      data: {
        type: data.type,
        email: data.email,
        name: data.name,
        bibNumber: data.bibNumber || null,
        eventId: data.eventId || null,
        reason: data.reason || null,
      },
    });

    // Create audit log
    await prisma.gdprAuditLog.create({
      data: {
        requestId: gdprRequest.id,
        action: "REQUEST_CREATED",
        details: `Demande de ${data.type.toLowerCase()} créée par ${data.name} (${data.email})`,
      },
    });

    return NextResponse.json({
      message: "Votre demande a été enregistrée. Vous serez contacté par email dans un délai de 30 jours.",
      requestId: gdprRequest.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("GDPR request error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la soumission de la demande" },
      { status: 500 }
    );
  }
}
