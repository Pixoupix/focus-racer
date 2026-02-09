import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event || (event.userId !== session.user.id && session.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const entries = await prisma.startListEntry.findMany({
      where: { eventId: id },
      orderBy: { bibNumber: "asc" },
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error("Error fetching start list:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event || (event.userId !== session.user.id && session.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const body = await request.json();
    const { entries } = body as {
      entries: Array<{
        bibNumber: string;
        firstName: string;
        lastName: string;
        email?: string;
      }>;
    };

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: "Aucune entrée fournie" }, { status: 400 });
    }

    // Validate entries
    const validEntries = entries.filter(
      (e) => e.bibNumber && e.firstName && e.lastName
    );

    if (validEntries.length === 0) {
      return NextResponse.json(
        { error: "Aucune entrée valide (bibNumber, firstName, lastName requis)" },
        { status: 400 }
      );
    }

    // Upsert entries (update if bibNumber already exists for event)
    const results = await Promise.allSettled(
      validEntries.map((entry) =>
        prisma.startListEntry.upsert({
          where: {
            eventId_bibNumber: {
              eventId: id,
              bibNumber: entry.bibNumber.trim(),
            },
          },
          update: {
            firstName: entry.firstName.trim(),
            lastName: entry.lastName.trim(),
            email: entry.email?.trim() || null,
          },
          create: {
            eventId: id,
            bibNumber: entry.bibNumber.trim(),
            firstName: entry.firstName.trim(),
            lastName: entry.lastName.trim(),
            email: entry.email?.trim() || null,
          },
        })
      )
    );

    const imported = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return NextResponse.json({
      imported,
      failed,
      total: validEntries.length,
    });
  } catch (error) {
    console.error("Error importing start list:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event || (event.userId !== session.user.id && session.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    await prisma.startListEntry.deleteMany({ where: { eventId: id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting start list:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
