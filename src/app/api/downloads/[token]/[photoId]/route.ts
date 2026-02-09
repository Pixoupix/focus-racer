import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createReadStream, existsSync } from "fs";
import path from "path";
import { PassThrough } from "stream";
import { ReadableStream } from "stream/web";

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

    const photoPath = path.resolve(item.photo.path);
    if (!existsSync(photoPath)) {
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

    const fileStream = createReadStream(photoPath);
    const passThrough = new PassThrough();
    fileStream.pipe(passThrough);

    const webStream = ReadableStream.from(passThrough as AsyncIterable<Uint8Array>);

    const ext = path.extname(item.photo.originalName) || ".jpg";
    const mimeTypes: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
    };

    return new NextResponse(webStream as unknown as BodyInit, {
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
