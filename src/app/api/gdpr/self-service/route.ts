import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const requests = await prisma.gdprRequest.findMany({
    where: { email: session.user.email! },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ requests });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json();
  const { bibNumber, eventId, reason } = body;

  if (!bibNumber || !eventId) {
    return NextResponse.json({ error: "Dossard et événement requis" }, { status: 400 });
  }

  // Verify that this bib number exists in the event and is linked to the user's name
  const startListEntry = await prisma.startListEntry.findFirst({
    where: {
      eventId,
      bibNumber: bibNumber.toString(),
      OR: [
        { email: session.user.email! },
        {
          AND: [
            { firstName: { contains: session.user.name?.split(" ")[0] || "", mode: "insensitive" } },
          ],
        },
      ],
    },
  });

  // Also check if photos with this bib exist
  const photosWithBib = await prisma.bibNumber.findMany({
    where: {
      number: bibNumber.toString(),
      photo: { eventId },
    },
    select: { id: true },
  });

  if (!startListEntry && photosWithBib.length === 0) {
    return NextResponse.json({
      error: "Impossible de vérifier votre identité. Le dossard ne correspond pas à votre profil dans cet événement.",
    }, { status: 400 });
  }

  // Check for existing pending request
  const existingRequest = await prisma.gdprRequest.findFirst({
    where: {
      email: session.user.email!,
      status: { in: ["PENDING", "PROCESSING"] },
    },
  });

  if (existingRequest) {
    return NextResponse.json({
      error: "Vous avez déjà une demande en cours de traitement.",
    }, { status: 400 });
  }

  const gdprRequest = await prisma.gdprRequest.create({
    data: {
      type: "DELETION",
      email: session.user.email!,
      name: session.user.name || "",
      bibNumber: bibNumber.toString(),
      eventId,
      reason: reason || "Demande de suppression RGPD par le coureur",
      auditLogs: {
        create: {
          action: "REQUEST_CREATED",
          details: `Demande créée par le coureur (self-service). Dossard: ${bibNumber}`,
          performedBy: session.user.email,
        },
      },
    },
  });

  return NextResponse.json(gdprRequest, { status: 201 });
}
