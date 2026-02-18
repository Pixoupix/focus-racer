import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import archiver from "archiver";
import path from "path";
import { PassThrough } from "stream";
import { ReadableStream } from "stream/web";
import { getFromS3, getFromS3AsBuffer, publicPathToS3Key } from "@/lib/s3";

/** Get the S3 key for a photo, handling both new (S3 key) and legacy (local path) formats */
function getPhotoS3Key(photo: { path: string; s3Key?: string | null }): string {
  // New format: path IS the S3 key (starts with "events/")
  if (photo.path.startsWith("events/")) return photo.path;
  // Legacy: use s3Key field if available
  if (photo.s3Key) return photo.s3Key;
  // Fallback: convert local path to S3 key
  return publicPathToS3Key(photo.path);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const order = await prisma.order.findUnique({
      where: { downloadToken: token },
      include: {
        event: true,
        items: {
          include: {
            photo: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Lien invalide" }, { status: 404 });
    }

    if (order.status !== "PAID") {
      return NextResponse.json(
        { error: "Commande non payée" },
        { status: 403 }
      );
    }

    if (order.downloadExpiresAt && new Date() > order.downloadExpiresAt) {
      return NextResponse.json(
        { error: "Lien expiré. Rendez-vous dans votre espace achats pour régénérer un lien." },
        { status: 410 }
      );
    }

    // Collect valid photos (those with a path/S3 key)
    const photoItems = order.items.filter((item) => item.photo.path);

    if (photoItems.length === 0) {
      return NextResponse.json(
        { error: "Aucune photo disponible" },
        { status: 404 }
      );
    }

    // Update download stats
    await prisma.order.update({
      where: { id: order.id },
      data: {
        downloadCount: { increment: 1 },
        lastDownloadAt: new Date(),
      },
    });

    // If single photo, stream it directly from S3
    if (photoItems.length === 1) {
      const { photo } = photoItems[0];
      const s3Key = getPhotoS3Key(photo);
      const stream = await getFromS3(s3Key);
      if (!stream) {
        return NextResponse.json({ error: "Fichier non trouvé" }, { status: 404 });
      }

      return new NextResponse(stream as unknown as BodyInit, {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(photo.originalName)}"`,
        },
      });
    }

    // Multiple photos: create ZIP
    const passThrough = new PassThrough();
    const archive = archiver("zip", { zlib: { level: 5 } });

    archive.on("error", (err) => {
      console.error("Archive error:", err);
      passThrough.destroy(err);
    });

    archive.pipe(passThrough);

    // Deduplicate filenames and append buffers from S3
    const usedNames = new Set<string>();
    for (const { photo } of photoItems) {
      let finalName = photo.originalName;
      let counter = 1;
      while (usedNames.has(finalName)) {
        const ext = path.extname(photo.originalName);
        const base = path.basename(photo.originalName, ext);
        finalName = `${base}_${counter}${ext}`;
        counter++;
      }
      usedNames.add(finalName);

      try {
        const s3Key = getPhotoS3Key(photo);
        const buffer = await getFromS3AsBuffer(s3Key);
        archive.append(buffer, { name: finalName });
      } catch (err) {
        console.error(`Failed to fetch ${photo.path} from S3:`, err);
      }
    }

    archive.finalize();

    const eventSlug = order.event.name
      .replace(/[^a-zA-Z0-9]/g, "_")
      .slice(0, 30);
    const zipName = `FocusRacer_${eventSlug}_${order.id.slice(-6)}.zip`;

    const webStream = ReadableStream.from(passThrough as AsyncIterable<Uint8Array>);

    return new NextResponse(webStream as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipName}"`,
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
