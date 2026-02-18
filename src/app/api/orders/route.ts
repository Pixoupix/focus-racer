import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { s3KeyToPublicPath } from "@/lib/s3";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const orders = await prisma.order.findMany({
      where: { userId: session.user.id },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            date: true,
            coverImage: true,
          },
        },
        items: {
          include: {
            photo: {
              select: {
                id: true,
                thumbnailPath: true,
                originalName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Convert S3 keys to public paths for frontend
    const mapped = orders.map((order) => ({
      ...order,
      event: {
        ...order.event,
        coverImage: order.event.coverImage ? s3KeyToPublicPath(order.event.coverImage) : null,
      },
      items: order.items.map((item) => ({
        ...item,
        photo: {
          ...item.photo,
          thumbnailPath: item.photo.thumbnailPath ? s3KeyToPublicPath(item.photo.thumbnailPath) : null,
        },
      })),
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
