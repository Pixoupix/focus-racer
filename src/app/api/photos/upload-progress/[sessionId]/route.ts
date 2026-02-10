import { NextRequest } from "next/server";
import {
  getUploadSession,
  addSessionListener,
  removeSessionListener,
} from "@/lib/upload-session";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const { sessionId } = params;

  const session = getUploadSession(sessionId);
  if (!session) {
    return new Response("Session not found", { status: 404 });
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      addSessionListener(sessionId, controller);

      // Send initial state
      const encoder = new TextEncoder();
      const percent = session.total > 0
        ? Math.round((session.processed / session.total) * 100)
        : 0;
      const initialData = JSON.stringify({
        total: session.total,
        processed: session.processed,
        percent,
        currentStep: session.currentStep,
        creditsRefunded: session.creditsRefunded,
        complete: session.complete,
      });
      controller.enqueue(encoder.encode(`data: ${initialData}\n\n`));

      // Cleanup on abort
      request.signal.addEventListener("abort", () => {
        removeSessionListener(sessionId, controller);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
    cancel(controller) {
      removeSessionListener(sessionId, controller as ReadableStreamController<Uint8Array>);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
