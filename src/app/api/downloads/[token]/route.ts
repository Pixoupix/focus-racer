import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import archiver from "archiver";
import { createReadStream, existsSync } from "fs";
import path from "path";
import { PassThrough } from "stream";
import { ReadableStream } from "stream/web";

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

    // Collect valid photo paths
    const photoPaths: { filePath: string; name: string }[] = [];
    for (const item of order.items) {
      const photoPath = path.resolve(item.photo.path);
      if (existsSync(photoPath)) {
        photoPaths.push({
          filePath: photoPath,
          name: item.photo.originalName,
        });
      }
    }

    if (photoPaths.length === 0) {
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

    // If single photo, stream it directly
    if (photoPaths.length === 1) {
      const { filePath, name } = photoPaths[0];
      const fileStream = createReadStream(filePath);
      const passThrough = new PassThrough();
      fileStream.pipe(passThrough);

      const webStream = ReadableStream.from(passThrough as AsyncIterable<Uint8Array>);

      return new NextResponse(webStream as unknown as BodyInit, {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(name)}"`,
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

    // Deduplicate filenames
    const usedNames = new Set<string>();
    for (const { filePath, name } of photoPaths) {
      let finalName = name;
      let counter = 1;
      while (usedNames.has(finalName)) {
        const ext = path.extname(name);
        const base = path.basename(name, ext);
        finalName = `${base}_${counter}${ext}`;
        counter++;
      }
      usedNames.add(finalName);
      archive.file(filePath, { name: finalName });
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
