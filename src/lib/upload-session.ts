import { v4 as uuidv4 } from "uuid";

export interface UploadSessionData {
  userId: string;
  eventId: string;
  total: number;
  processed: number;
  creditsRefunded: number;
  currentStep: string;
  complete: boolean;
  listeners: Set<ReadableStreamController<Uint8Array>>;
}

const sessions = new Map<string, UploadSessionData>();

export function createUploadSession(
  userId: string,
  eventId: string,
  total: number
): string {
  const sessionId = uuidv4();
  sessions.set(sessionId, {
    userId,
    eventId,
    total,
    processed: 0,
    creditsRefunded: 0,
    currentStep: "Demarrage...",
    complete: false,
    listeners: new Set(),
  });
  return sessionId;
}

export function getUploadSession(
  sessionId: string
): UploadSessionData | undefined {
  return sessions.get(sessionId);
}

export function updateUploadProgress(
  sessionId: string,
  update: Partial<
    Pick<UploadSessionData, "processed" | "currentStep" | "complete" | "creditsRefunded">
  >
) {
  const session = sessions.get(sessionId);
  if (!session) return;

  if (update.processed !== undefined) session.processed = update.processed;
  if (update.currentStep !== undefined) session.currentStep = update.currentStep;
  if (update.creditsRefunded !== undefined) session.creditsRefunded = update.creditsRefunded;
  if (update.complete !== undefined) session.complete = update.complete;

  // Notify all SSE listeners
  const percent = session.total > 0 ? Math.round((session.processed / session.total) * 100) : 0;
  const data = JSON.stringify({
    total: session.total,
    processed: session.processed,
    percent,
    currentStep: session.currentStep,
    creditsRefunded: session.creditsRefunded,
    complete: session.complete,
  });

  const encoder = new TextEncoder();
  for (const controller of session.listeners) {
    try {
      controller.enqueue(encoder.encode(`data: ${data}\n\n`));
    } catch {
      session.listeners.delete(controller);
    }
  }

  // Cleanup completed sessions after 5 minutes
  if (session.complete) {
    setTimeout(() => sessions.delete(sessionId), 5 * 60 * 1000);
  }
}

export function addSessionListener(
  sessionId: string,
  controller: ReadableStreamController<Uint8Array>
) {
  const session = sessions.get(sessionId);
  if (session) {
    session.listeners.add(controller);
  }
}

export function removeSessionListener(
  sessionId: string,
  controller: ReadableStreamController<Uint8Array>
) {
  const session = sessions.get(sessionId);
  if (session) {
    session.listeners.delete(controller);
  }
}
