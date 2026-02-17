import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

// Search photos by runner name (via start-list)
export async function GET(request: NextRequest) {
  // Rate limit: 30 searches/minute per IP
  const limited = rateLimit(request, "photo-search", { limit: 30 });
  if (limited) return limited;
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");
  const name = searchParams.get("name");
  const bib = searchParams.get("bib");

  if (!eventId) {
    return NextResponse.json({ error: "eventId requis" }, { status: 400 });
  }

  try {
    // Search by bib number
    if (bib) {
      const bibNumbers = await prisma.bibNumber.findMany({
        where: {
          number: bib,
          photo: { eventId, event: { status: "PUBLISHED" } },
        },
        include: {
          photo: {
            select: {
              id: true,
              thumbnailPath: true,
              webPath: true,
              path: true,
              originalName: true,
              bibNumbers: { select: { id: true, number: true } },
            },
          },
        },
      });

      const photosMap = new Map();
      bibNumbers.forEach((b) => {
        if (!photosMap.has(b.photo.id)) {
          photosMap.set(b.photo.id, {
            id: b.photo.id,
            src: b.photo.thumbnailPath || b.photo.webPath || b.photo.path,
            originalName: b.photo.originalName,
            bibNumbers: b.photo.bibNumbers,
          });
        }
      });

      // Try to find runner info from start-list
      const runner = await prisma.startListEntry.findUnique({
        where: { eventId_bibNumber: { eventId, bibNumber: bib } },
      });

      return NextResponse.json({
        query: bib,
        type: "bib",
        runner: runner ? { firstName: runner.firstName, lastName: runner.lastName, bibNumber: runner.bibNumber } : null,
        count: photosMap.size,
        photos: Array.from(photosMap.values()),
      });
    }

    // Search by name
    if (name) {
      const searchTerm = name.trim();
      const entries = await prisma.startListEntry.findMany({
        where: {
          eventId,
          event: { status: "PUBLISHED" },
          OR: [
            { firstName: { contains: searchTerm, mode: "insensitive" } },
            { lastName: { contains: searchTerm, mode: "insensitive" } },
          ],
        },
      });

      if (entries.length === 0) {
        return NextResponse.json({
          query: name,
          type: "name",
          runner: null,
          count: 0,
          photos: [],
        });
      }

      // Get all bib numbers found
      const bibNums = entries.map((e) => e.bibNumber);

      const bibNumbers = await prisma.bibNumber.findMany({
        where: {
          number: { in: bibNums },
          photo: { eventId },
        },
        include: {
          photo: {
            select: {
              id: true,
              thumbnailPath: true,
              webPath: true,
              path: true,
              originalName: true,
              bibNumbers: { select: { id: true, number: true } },
            },
          },
        },
      });

      const photosMap = new Map();
      bibNumbers.forEach((b) => {
        if (!photosMap.has(b.photo.id)) {
          photosMap.set(b.photo.id, {
            id: b.photo.id,
            src: b.photo.thumbnailPath || b.photo.webPath || b.photo.path,
            originalName: b.photo.originalName,
            bibNumbers: b.photo.bibNumbers,
          });
        }
      });

      const firstEntry = entries[0];
      return NextResponse.json({
        query: name,
        type: "name",
        runner: { firstName: firstEntry.firstName, lastName: firstEntry.lastName, bibNumber: firstEntry.bibNumber },
        matchedRunners: entries.map((e) => ({ firstName: e.firstName, lastName: e.lastName, bibNumber: e.bibNumber })),
        count: photosMap.size,
        photos: Array.from(photosMap.values()),
      });
    }

    return NextResponse.json({ error: "Paramètre 'bib' ou 'name' requis" }, { status: 400 });
  } catch (error) {
    console.error("Error searching photos:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
