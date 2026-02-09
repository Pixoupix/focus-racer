import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { sendRunnerNotification } from "@/lib/email";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;

    // Verify event ownership
    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      return NextResponse.json({ error: "Événement non trouvé" }, { status: 404 });
    }

    if (event.userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    // Get start-list entries with email that haven't been notified
    const startListEntries = await prisma.startListEntry.findMany({
      where: {
        eventId: id,
        email: { not: null },
        notifiedAt: null,
      },
    });

    if (startListEntries.length === 0) {
      return NextResponse.json({
        sent: 0,
        message: "Aucun coureur à notifier (pas d'emails ou déjà notifiés)",
      });
    }

    // Get all detected bib numbers for this event
    const detectedBibs = await prisma.bibNumber.findMany({
      where: {
        photo: { eventId: id },
      },
      select: {
        number: true,
        photoId: true,
      },
    });

    // Count photos per bib number
    const photosPerBib = new Map<string, number>();
    for (const bib of detectedBibs) {
      const current = photosPerBib.get(bib.number) || 0;
      photosPerBib.set(bib.number, current + 1);
    }

    // Send notifications
    let sent = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const entry of startListEntries) {
      const photoCount = photosPerBib.get(entry.bibNumber) || 0;

      if (photoCount === 0) {
        skipped++;
        continue;
      }

      if (!entry.email) continue;

      try {
        await sendRunnerNotification({
          to: entry.email,
          firstName: entry.firstName,
          lastName: entry.lastName,
          bibNumber: entry.bibNumber,
          eventName: event.name,
          eventDate: event.date,
          eventLocation: event.location,
          photoCount,
          eventId: id,
        });

        // Mark as notified
        await prisma.startListEntry.update({
          where: { id: entry.id },
          data: { notifiedAt: new Date() },
        });

        sent++;

        // Rate limit: max 10 emails per second (Resend limit)
        if (sent % 10 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (err) {
        console.error(`[Notify] Error sending to ${entry.email}:`, err);
        errors.push(entry.email);
      }
    }

    return NextResponse.json({
      sent,
      skipped,
      errors: errors.length,
      message: `${sent} coureur${sent > 1 ? "s" : ""} notifié${sent > 1 ? "s" : ""}${skipped > 0 ? `, ${skipped} sans photos détectées` : ""}`,
    });
  } catch (error) {
    console.error("Notify runners error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'envoi des notifications" },
      { status: 500 }
    );
  }
}

// GET: Check notification status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;

    const [total, withEmail, notified] = await Promise.all([
      prisma.startListEntry.count({ where: { eventId: id } }),
      prisma.startListEntry.count({ where: { eventId: id, email: { not: null } } }),
      prisma.startListEntry.count({ where: { eventId: id, notifiedAt: { not: null } } }),
    ]);

    return NextResponse.json({
      total,
      withEmail,
      notified,
      pending: withEmail - notified,
    });
  } catch (error) {
    console.error("Notify status error:", error);
    return NextResponse.json(
      { error: "Erreur" },
      { status: 500 }
    );
  }
}
