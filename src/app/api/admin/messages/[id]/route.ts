import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

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
    data.adminReply = adminReply;
    data.repliedBy = session.user.name || session.user.email;
    data.repliedAt = new Date();
    if (!status) data.status = "RESOLVED";
  }

  const message = await prisma.supportMessage.update({
    where: { id: params.id },
    data,
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  return NextResponse.json(message);
}
