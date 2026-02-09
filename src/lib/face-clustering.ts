import { prisma } from "./prisma";
import { searchFacesByFaceId } from "./rekognition";
import { aiConfig } from "./ai-config";

interface ClusteringStats {
  totalAnchorPhotos: number;
  totalOrphanPhotos: number;
  facesSearched: number;
  newBibsAssigned: number;
  photosLinked: number;
  errors: string[];
}

/**
 * Face Clustering Service
 *
 * This runs AFTER all photos have been uploaded and processed.
 * It links photos by face similarity to propagate bib numbers.
 *
 * Algorithm:
 * 1. Get all "anchor" photos (photos with detected bib numbers)
 * 2. Get all "orphan" photos (photos without any bib numbers)
 * 3. For each face in anchor photos, search for similar faces
 * 4. If a similar face is found in an orphan photo, assign the bib number
 *
 * Cost: ~$0.0004 per face searched (AWS SearchFaces)
 */
export async function clusterFacesByEvent(eventId: string): Promise<ClusteringStats> {
  const stats: ClusteringStats = {
    totalAnchorPhotos: 0,
    totalOrphanPhotos: 0,
    facesSearched: 0,
    newBibsAssigned: 0,
    photosLinked: 0,
    errors: [],
  };

  if (!aiConfig.faceIndexEnabled) {
    console.log("[Clustering] Face indexing not enabled, skipping");
    return stats;
  }

  console.log(`[Clustering] Starting face clustering for event ${eventId}`);

  try {
    // 1. Get anchor photos (have bib numbers AND have indexed faces)
    const anchorPhotos = await prisma.photo.findMany({
      where: {
        eventId,
        bibNumbers: { some: {} },
        faces: { some: {} },
      },
      include: {
        bibNumbers: true,
        faces: true,
      },
    });

    stats.totalAnchorPhotos = anchorPhotos.length;
    console.log(`[Clustering] Found ${anchorPhotos.length} anchor photos with bibs and faces`);

    if (anchorPhotos.length === 0) {
      console.log("[Clustering] No anchor photos found, nothing to cluster");
      return stats;
    }

    // 2. Get orphan photos (no bib numbers but have indexed faces)
    const orphanPhotos = await prisma.photo.findMany({
      where: {
        eventId,
        bibNumbers: { none: {} },
        faces: { some: {} },
      },
      include: {
        faces: true,
      },
    });

    stats.totalOrphanPhotos = orphanPhotos.length;
    console.log(`[Clustering] Found ${orphanPhotos.length} orphan photos to potentially link`);

    if (orphanPhotos.length === 0) {
      console.log("[Clustering] No orphan photos found, clustering complete");
      return stats;
    }

    // Create a map of faceId -> photoId for orphans
    const orphanFaceToPhoto = new Map<string, string>();
    for (const photo of orphanPhotos) {
      for (const face of photo.faces) {
        orphanFaceToPhoto.set(face.faceId, photo.id);
      }
    }

    // 3. For each anchor photo, search for similar faces
    const processedOrphans = new Set<string>();

    for (const anchor of anchorPhotos) {
      const bibNumbers = anchor.bibNumbers.map((b) => b.number);

      for (const face of anchor.faces) {
        try {
          stats.facesSearched++;

          // Search for similar faces in the collection
          const matches = await searchFacesByFaceId(face.faceId, 100, 85);

          for (const match of matches) {
            // Extract photoId from externalImageId (format: "eventId:photoId")
            const parts = match.externalImageId.split(":");
            if (parts.length !== 2) continue;

            const [matchEventId, matchPhotoId] = parts;

            // Only consider matches from the same event
            if (matchEventId !== eventId) continue;

            // Skip if this is the anchor photo itself
            if (matchPhotoId === anchor.id) continue;

            // Check if this is an orphan photo
            if (!orphanFaceToPhoto.has(match.faceId)) continue;

            const orphanPhotoId = orphanFaceToPhoto.get(match.faceId);
            if (!orphanPhotoId || processedOrphans.has(`${orphanPhotoId}:${bibNumbers.join(",")}`)) continue;

            // Assign all bib numbers from anchor to this orphan photo
            for (const bibNumber of bibNumbers) {
              try {
                await prisma.bibNumber.upsert({
                  where: {
                    photoId_number: {
                      photoId: orphanPhotoId,
                      number: bibNumber,
                    },
                  },
                  create: {
                    photoId: orphanPhotoId,
                    number: bibNumber,
                    confidence: match.similarity / 100,
                    source: "face_cluster",
                  },
                  update: {
                    // Don't overwrite if already exists with higher confidence
                  },
                });

                stats.newBibsAssigned++;
                console.log(`[Clustering] Linked photo ${orphanPhotoId} to bib #${bibNumber} (similarity: ${match.similarity.toFixed(1)}%)`);
              } catch {
                // Might fail if already exists, that's OK
              }
            }

            processedOrphans.add(`${orphanPhotoId}:${bibNumbers.join(",")}`);
            stats.photosLinked++;
          }
        } catch (err) {
          const errorMsg = `Error searching face ${face.faceId}: ${err}`;
          console.error(`[Clustering] ${errorMsg}`);
          stats.errors.push(errorMsg);
        }
      }
    }

    // 4. Update event to mark clustering as done
    await prisma.event.update({
      where: { id: eventId },
      data: { faceClusteredAt: new Date() },
    });

    console.log(`[Clustering] Complete! Linked ${stats.photosLinked} orphan photos, assigned ${stats.newBibsAssigned} new bibs`);

    return stats;
  } catch (error) {
    console.error("[Clustering] Fatal error:", error);
    stats.errors.push(`Fatal error: ${error}`);
    return stats;
  }
}

/**
 * Check if an event needs clustering.
 * Returns true if:
 * - Event has photos with faces indexed
 * - Event has orphan photos (no bibs)
 * - Clustering hasn't been run recently (or never)
 */
export async function eventNeedsClustering(eventId: string): Promise<boolean> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      _count: {
        select: {
          photos: true,
        },
      },
    },
  });

  if (!event) return false;

  // Check if there are orphan photos
  const orphanCount = await prisma.photo.count({
    where: {
      eventId,
      bibNumbers: { none: {} },
      faces: { some: {} },
    },
  });

  if (orphanCount === 0) return false;

  // Check if clustering was run after the last photo was added
  const latestPhoto = await prisma.photo.findFirst({
    where: { eventId },
    orderBy: { createdAt: "desc" },
  });

  if (!latestPhoto) return false;

  // If never clustered, or clustered before latest photo, needs clustering
  if (!event.faceClusteredAt) return true;
  if (event.faceClusteredAt < latestPhoto.createdAt) return true;

  return false;
}

/**
 * Get clustering stats for an event (for display in UI)
 */
export async function getClusteringStats(eventId: string) {
  const [totalPhotos, photosWithBibs, photosWithFaces, orphanPhotos] = await Promise.all([
    prisma.photo.count({ where: { eventId } }),
    prisma.photo.count({ where: { eventId, bibNumbers: { some: {} } } }),
    prisma.photo.count({ where: { eventId, faces: { some: {} } } }),
    prisma.photo.count({ where: { eventId, bibNumbers: { none: {} }, faces: { some: {} } } }),
  ]);

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { faceClusteredAt: true },
  });

  return {
    totalPhotos,
    photosWithBibs,
    photosWithFaces,
    orphanPhotos,
    lastClusteredAt: event?.faceClusteredAt,
    needsClustering: orphanPhotos > 0 && (!event?.faceClusteredAt || orphanPhotos > 0),
  };
}
