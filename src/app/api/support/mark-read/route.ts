import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { notificationEmitter } from "@/lib/notification-emitter";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const result = await prisma.supportMessage.updateMany({
      where: {
        userId: session.user.id,
        adminReply: { not: null },
        readByUser: false,
      },
      data: { readByUser: true },
    });

    // If messages were marked read, notify user's other tabs to update badge
    if (result.count > 0) {
      notificationEmitter.notifyUser(session.user.id);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
