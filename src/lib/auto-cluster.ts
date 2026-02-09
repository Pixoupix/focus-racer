import { clusterFacesByEvent, eventNeedsClustering } from "./face-clustering";
import { aiConfig } from "./ai-config";

/**
 * Auto-clustering with debounce.
 *
 * After each photo finishes AI processing, call `scheduleAutoClustering(eventId)`.
 * The clustering will run DELAY_MS after the last call, so uploading 100 photos
 * only triggers one clustering run (~30s after the last photo is processed).
 */

const DELAY_MS = 30_000; // 30 seconds after last processed photo

const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();
const runningEvents = new Set<string>();

export function scheduleAutoClustering(eventId: string): void {
  if (!aiConfig.faceIndexEnabled) return;

  // Clear any existing timer for this event
  const existing = pendingTimers.get(eventId);
  if (existing) {
    clearTimeout(existing);
  }

  // Schedule a new run
  const timer = setTimeout(async () => {
    pendingTimers.delete(eventId);

    // Avoid concurrent clustering on the same event
    if (runningEvents.has(eventId)) {
      console.log(`[AutoCluster] Clustering already running for event ${eventId}, rescheduling`);
      scheduleAutoClustering(eventId);
      return;
    }

    try {
      const needsClustering = await eventNeedsClustering(eventId);
      if (!needsClustering) {
        console.log(`[AutoCluster] Event ${eventId}: no clustering needed`);
        return;
      }

      runningEvents.add(eventId);
      console.log(`[AutoCluster] Starting automatic clustering for event ${eventId}`);

      const stats = await clusterFacesByEvent(eventId);
      console.log(
        `[AutoCluster] Event ${eventId}: linked ${stats.photosLinked} photos, assigned ${stats.newBibsAssigned} bibs`
      );
    } catch (error) {
      console.error(`[AutoCluster] Error for event ${eventId}:`, error);
    } finally {
      runningEvents.delete(eventId);
    }
  }, DELAY_MS);

  pendingTimers.set(eventId, timer);
  console.log(`[AutoCluster] Clustering scheduled for event ${eventId} in ${DELAY_MS / 1000}s`);
}
