import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import { createReadStream } from "fs";
import path from "path";
import { Readable } from "stream";
import { rateLimit } from "@/lib/rate-limit";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./public/uploads";

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  // Rate limit: 120 images/minute per IP (prevents bulk scraping)
  const limited = rateLimit(request, "uploads", { limit: 120 });
  if (limited) return limited;

  // Hotlink protection: block requests from external sites
  const referer = request.headers.get("referer") || "";
  const isAllowed =
    !referer ||
    referer.includes("focusracer.swipego.app") ||
    referer.includes("localhost");
  if (!isAllowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const segments = params.path;
  if (segments.some((s) => s.includes("..") || s.includes("\0"))) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const filePath = path.join(UPLOAD_DIR, ...segments);

  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType =
      ext === ".jpg" || ext === ".jpeg"
        ? "image/jpeg"
        : ext === ".png"
          ? "image/png"
          : ext === ".webp"
            ? "image/webp"
            : ext === ".gif"
              ? "image/gif"
              : "application/octet-stream";

    // Stream the file instead of loading entirely into memory
    const nodeStream = createReadStream(filePath);
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    return new Response(webStream, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": stat.size.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
