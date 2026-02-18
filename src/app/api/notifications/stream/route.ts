import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notificationEmitter } from "@/lib/notification-emitter";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const isAdmin = (session.user as any).role === "ADMIN";
  const userId = session.user.id;

  const encoder = new TextEncoder();
  let subId: string | null = null;
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`));

      // Subscribe to notifications
      const listener = (data: { type: string }) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Stream closed
          cleanup();
        }
      };

      if (isAdmin) {
        subId = notificationEmitter.subscribeAdmin(listener);
      } else {
        subId = notificationEmitter.subscribeUser(userId, listener);
      }

      // Heartbeat every 25s to keep connection alive
      heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          cleanup();
        }
      }, 25000);

      function cleanup() {
        if (subId) {
          notificationEmitter.unsubscribe(subId);
          subId = null;
        }
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
      }
    },
    cancel() {
      if (subId) {
        notificationEmitter.unsubscribe(subId);
        subId = null;
      }
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
