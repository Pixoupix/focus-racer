import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";
import { invalidateWatermarkCache } from "@/lib/watermark";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./public/uploads";
const WATERMARK_DIR = path.join(UPLOAD_DIR, "platform");
const WATERMARK_FILENAME = "watermark.png";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorise" }, { status: 403 });
    }

    const settings = await prisma.platformSettings.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default" },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching watermark settings:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorise" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const opacityStr = formData.get("opacity") as string | null;
    const opacity = opacityStr ? parseFloat(opacityStr) : 0.3;

    if (opacity < 0.05 || opacity > 1) {
      return NextResponse.json({ error: "Opacite invalide (0.05-1)" }, { status: 400 });
    }

    await fs.mkdir(WATERMARK_DIR, { recursive: true });

    const watermarkPath = `/uploads/platform/${WATERMARK_FILENAME}`;

    if (file) {
      if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: "Le fichier doit etre une image" }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(path.join(WATERMARK_DIR, WATERMARK_FILENAME), buffer);
    }

    const settings = await prisma.platformSettings.upsert({
      where: { id: "default" },
      update: {
        ...(file ? { watermarkPath } : {}),
        watermarkOpacity: opacity,
      },
      create: {
        id: "default",
        ...(file ? { watermarkPath } : {}),
        watermarkOpacity: opacity,
      },
    });

    invalidateWatermarkCache();

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error updating watermark settings:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorise" }, { status: 403 });
    }

    // Delete file from disk
    try {
      await fs.unlink(path.join(WATERMARK_DIR, WATERMARK_FILENAME));
    } catch {
      // File may not exist
    }

    const settings = await prisma.platformSettings.upsert({
      where: { id: "default" },
      update: { watermarkPath: null },
      create: { id: "default", watermarkPath: null },
    });

    invalidateWatermarkCache();

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error deleting watermark:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
