import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { rateLimit } from "@/lib/rate-limit";
import { getFromS3, getS3ObjectSize } from "@/lib/s3";

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

  // Map URL segments to S3 key
  // URL: /uploads/{eventId}/thumbs/wm_xxx.webp → S3: events/{eventId}/thumbs/wm_xxx.webp
  // URL: /uploads/platform/watermark.png → S3: platform/watermark.png
  let s3Key: string;
  if (segments[0] === "platform") {
    s3Key = segments.join("/");
  } else {
    s3Key = `events/${segments.join("/")}`;
  }

  try {
    const stream = await getFromS3(s3Key);
    if (!stream) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const filename = segments[segments.length - 1];
    const ext = path.extname(filename).toLowerCase();
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

    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    };

    // Try to get content length for better streaming
    const size = await getS3ObjectSize(s3Key);
    if (size) {
      headers["Content-Length"] = size.toString();
    }

    return new Response(stream, { headers });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
