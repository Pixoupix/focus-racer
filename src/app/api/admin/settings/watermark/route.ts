import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { invalidateWatermarkCache } from "@/lib/watermark";
import { uploadToS3, deleteFromS3 } from "@/lib/s3";

const WATERMARK_S3_KEY = "platform/watermark.png";

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

    // Store watermark path as the S3 key (watermark.ts reads from S3 via publicPathToS3Key)
    const watermarkPath = `/uploads/platform/watermark.png`;

    if (file) {
      if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: "Le fichier doit etre une image" }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      await uploadToS3(buffer, WATERMARK_S3_KEY, file.type || "image/png");
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

    // Delete from S3
    try {
      await deleteFromS3(WATERMARK_S3_KEY);
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
