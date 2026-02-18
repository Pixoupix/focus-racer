import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { notificationEmitter } from "@/lib/notification-emitter";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const message = await prisma.supportMessage.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { id: true, name: true, email: true, role: true, company: true, phone: true } },
    },
  });

  if (!message) {
    return NextResponse.json({ error: "Message introuvable" }, { status: 404 });
  }

  return NextResponse.json(message);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await request.json();
  const { status, adminReply } = body;

  const data: any = {};
  if (status) data.status = status;
  if (adminReply) {
    // Fetch current message to get existing replies
    const current = await prisma.supportMessage.findUnique({
      where: { id: params.id },
    });
    const currentReplies = (current?.replies as any[]) || [];
    const newReply = {
      role: "admin",
      content: adminReply,
      date: new Date().toISOString(),
      author: session.user.name || session.user.email,
    };

    data.replies = [...currentReplies, newReply];
    data.adminReply = adminReply;
    data.repliedBy = session.user.name || session.user.email;
    data.repliedAt = new Date();
    data.readByUser = false;
    if (!status) data.status = "IN_PROGRESS";
  }

  const message = await prisma.supportMessage.update({
    where: { id: params.id },
    data,
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  // Notify user in real-time that admin replied or status changed
  if (message.userId) {
    notificationEmitter.notifyUser(message.userId);
  }
  // Also notify admin sidebar (badge count changes when status changes)
  notificationEmitter.notifyAdmin();

  return NextResponse.json(message);
}
