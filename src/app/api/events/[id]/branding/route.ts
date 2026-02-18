import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { uploadToS3, getS3Key, s3KeyToPublicPath } from "@/lib/s3";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event || (event.userId !== session.user.id && session.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const formData = await request.formData();
    const imageType = formData.get("type") as string; // coverImage, bannerImage, logoImage
    const file = formData.get("file") as File | null;

    if (!file || !imageType) {
      return NextResponse.json({ error: "Fichier et type requis" }, { status: 400 });
    }

    const validTypes = ["coverImage", "bannerImage", "logoImage"];
    if (!validTypes.includes(imageType)) {
      return NextResponse.json({ error: "Type d'image invalide" }, { status: 400 });
    }

    // Upload to S3
    const ext = path.extname(file.name);
    const filename = `${imageType}_${uuidv4()}${ext}`;
    const s3Key = getS3Key(id, filename, "branding");
    const contentType = file.type || "image/png";

    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadToS3(buffer, s3Key, contentType);

    // Store S3 key in DB
    await prisma.event.update({
      where: { id },
      data: { [imageType]: s3Key },
    });

    // Return public path for frontend
    return NextResponse.json({ path: s3KeyToPublicPath(s3Key) });
  } catch (error) {
    console.error("Error uploading branding:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
