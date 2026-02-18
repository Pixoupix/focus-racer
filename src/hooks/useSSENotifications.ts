"use client";

import { useEffect, useCallback, useRef } from "react";

// Shared SSE connection — one per browser tab, multiple consumers
let sharedEventSource: EventSource | null = null;
let refCount = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<(data: { type: string }) => void>();

function connect() {
  if (sharedEventSource) return;

  try {
    sharedEventSource = new EventSource("/api/notifications/stream");

    sharedEventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        for (const listener of listeners) {
          try {
            listener(data);
          } catch {
            // individual listener error
          }
        }
      } catch {
        // parse error
      }
    };

    sharedEventSource.onerror = () => {
      sharedEventSource?.close();
      sharedEventSource = null;
      // Reconnect after 3s if there are still consumers
      if (refCount > 0 && !reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          if (refCount > 0) connect();
        }, 3000);
      }
    };
  } catch {
    // EventSource not available
  }
}

function disconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (sharedEventSource) {
    sharedEventSource.close();
    sharedEventSource = null;
  }
}

/**
 * Hook to subscribe to real-time SSE notifications.
 * Shares a single EventSource connection across all consumers in the same tab.
 *
 * @param eventTypes - Array of event types to listen for (e.g. ["admin_unread", "connected"])
 * @param onNotification - Callback invoked when a matching event arrives
 */
export function useSSENotifications(
  eventTypes: string[],
  onNotification: () => void
) {
  const callbackRef = useRef(onNotification);
  callbackRef.current = onNotification;

  const typesKey = eventTypes.join(",");

  const listener = useCallback(
    (data: { type: string }) => {
      if (eventTypes.includes(data.type)) {
        callbackRef.current();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [typesKey]
  );

  useEffect(() => {
    listeners.add(listener);
    refCount++;

    // Connect if first consumer
    if (refCount === 1) {
      connect();
    }

    return () => {
      listeners.delete(listener);
      refCount--;

      // Disconnect if last consumer
      if (refCount === 0) {
        disconnect();
      }
    };
  }, [listener]);
}
