import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getConnector, listConnectors } from "@/lib/connectors";

// GET: List available connectors
export async function GET() {
  const connectorList = listConnectors().map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    requiredFields: c.requiredFields,
  }));

  return NextResponse.json(connectorList);
}

// POST: Import start-list from a connector
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id: eventId } = await params;

    // Verify event ownership
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json({ error: "Événement non trouvé" }, { status: 404 });
    }

    if (event.userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const body = await request.json();
    const { connectorId, config } = body;

    if (!connectorId) {
      return NextResponse.json({ error: "connectorId requis" }, { status: 400 });
    }

    const connector = getConnector(connectorId);
    if (!connector) {
      return NextResponse.json({ error: `Connecteur "${connectorId}" non trouvé` }, { status: 400 });
    }

    // Fetch participants from external platform
    const result = await connector.fetchParticipants(config || {});

    if (result.participants.length === 0) {
      return NextResponse.json({
        imported: 0,
        skipped: 0,
        message: "Aucun participant trouvé",
        source: result.source,
      });
    }

    // Upsert participants into start-list
    let imported = 0;
    let skipped = 0;

    for (const participant of result.participants) {
      try {
        await prisma.startListEntry.upsert({
          where: {
            eventId_bibNumber: {
              eventId,
              bibNumber: participant.bibNumber,
            },
          },
          update: {
            firstName: participant.firstName,
            lastName: participant.lastName,
            email: participant.email || undefined,
          },
          create: {
            eventId,
            bibNumber: participant.bibNumber,
            firstName: participant.firstName,
            lastName: participant.lastName,
            email: participant.email || null,
          },
        });
        imported++;
      } catch {
        skipped++;
      }
    }

    return NextResponse.json({
      imported,
      skipped,
      total: result.total,
      source: result.source,
      message: `${imported} participant${imported > 1 ? "s" : ""} importé${imported > 1 ? "s" : ""} depuis ${connector.name}`,
    });
  } catch (error) {
    console.error("Connector import error:", error);
    const message = error instanceof Error ? error.message : "Erreur lors de l'import";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
