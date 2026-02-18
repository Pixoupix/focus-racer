import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { notificationEmitter } from "@/lib/notification-emitter";

// GET - List user's support messages
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const [messages, total] = await Promise.all([
    prisma.supportMessage.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.supportMessage.count({ where: { userId: session.user.id } }),
  ]);

  return NextResponse.json({
    messages,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

// POST - Create a new support message
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json();
  const { subject, message, category, eventId, orderId } = body;

  if (!subject || !message) {
    return NextResponse.json({ error: "Sujet et message requis" }, { status: 400 });
  }

  const validCategories = ["BILLING", "SORTING", "GDPR", "ACCOUNT", "TECHNICAL", "EVENT", "OTHER"];
  if (category && !validCategories.includes(category)) {
    return NextResponse.json({ error: "Catégorie invalide" }, { status: 400 });
  }

  const supportMessage = await prisma.supportMessage.create({
    data: {
      userId: session.user.id,
      subject,
      message,
      category: category || "OTHER",
      eventId: eventId || null,
      orderId: orderId || null,
    },
  });

  // Notify admin in real-time that a new message arrived
  notificationEmitter.notifyAdmin();

  return NextResponse.json(supportMessage, { status: 201 });
}
