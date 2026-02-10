/**
 * 🏓 Keep-alive: pings /api/health every 10 min to prevent Render cold starts.
 * Auto-starts on first import (server-side only).
 */

const INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

let started = false;

export function startKeepAlive() {
  if (started || typeof window !== "undefined") return;
  started = true;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
  if (!appUrl) {
    console.log("[keep-alive] No APP_URL configured, skipping.");
    return;
  }

  const url = `${appUrl}/api/health`;

  console.log(`🏓 Keep-alive enabled: pinging ${url} every 10 min`);

  setInterval(async () => {
    try {
      const res = await fetch(url);
      if (res.ok) {
        console.log(`🏓 Keep-alive ping OK (${new Date().toISOString()})`);
      }
    } catch {
      // Silently ignore — server might be restarting
    }
  }, INTERVAL_MS);
}
