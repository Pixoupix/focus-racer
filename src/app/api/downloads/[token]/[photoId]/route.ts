import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import path from "path";
import { getFromS3, publicPathToS3Key } from "@/lib/s3";

/** Get the S3 key for a photo, handling both new (S3 key) and legacy (local path) formats */
function getPhotoS3Key(photo: { path: string; s3Key?: string | null }): string {
  if (photo.path.startsWith("events/")) return photo.path;
  if (photo.s3Key) return photo.s3Key;
  return publicPathToS3Key(photo.path);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; photoId: string }> }
) {
  try {
    const { token, photoId } = await params;

    const order = await prisma.order.findUnique({
      where: { downloadToken: token },
      include: {
        items: {
          include: { photo: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Lien invalide" }, { status: 404 });
    }

    if (order.status !== "PAID") {
      return NextResponse.json({ error: "Commande non payée" }, { status: 403 });
    }

    if (order.downloadExpiresAt && new Date() > order.downloadExpiresAt) {
      return NextResponse.json({ error: "Lien expiré" }, { status: 410 });
    }

    // Check that photo is in this order
    const item = order.items.find((i) => i.photoId === photoId);
    if (!item) {
      return NextResponse.json({ error: "Photo non trouvée dans cette commande" }, { status: 404 });
    }

    // Stream from S3
    const s3Key = getPhotoS3Key(item.photo);
    const stream = await getFromS3(s3Key);
    if (!stream) {
      return NextResponse.json({ error: "Fichier non trouvé" }, { status: 404 });
    }

    // Update download stats
    await prisma.order.update({
      where: { id: order.id },
      data: {
        downloadCount: { increment: 1 },
        lastDownloadAt: new Date(),
      },
    });

    const ext = path.extname(item.photo.originalName) || ".jpg";
    const mimeTypes: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
    };

    return new NextResponse(stream as unknown as BodyInit, {
      headers: {
        "Content-Type": mimeTypes[ext.toLowerCase()] || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(item.photo.originalName)}"`,
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
