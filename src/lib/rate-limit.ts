import { NextRequest, NextResponse } from "next/server";

/**
 * In-memory sliding window rate limiter.
 * Tracks request timestamps per IP, prunes expired entries automatically.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Cleanup every 5 minutes to avoid memory leak
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  const cutoff = now - windowMs;
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}

/**
 * Extract client IP from request headers (Caddy forwards X-Real-IP).
 */
function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    "unknown"
  );
}

interface RateLimitConfig {
  /** Max requests allowed in the window */
  limit: number;
  /** Window size in milliseconds (default: 60_000 = 1 minute) */
  windowMs?: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

/**
 * Check if a request is within rate limits.
 * Returns { allowed, remaining, resetMs }.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const { limit, windowMs = 60_000 } = config;
  const now = Date.now();
  const cutoff = now - windowMs;

  cleanup(windowMs);

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= limit) {
    const oldest = entry.timestamps[0];
    const resetMs = oldest + windowMs - now;
    return { allowed: false, remaining: 0, resetMs };
  }

  entry.timestamps.push(now);
  return {
    allowed: true,
    remaining: limit - entry.timestamps.length,
    resetMs: windowMs,
  };
}

/**
 * Rate limit middleware helper for API routes.
 * Returns null if allowed, or a 429 Response if rate-limited.
 */
export function rateLimit(
  request: NextRequest,
  routePrefix: string,
  config: RateLimitConfig
): NextResponse | null {
  const ip = getClientIp(request);
  const key = `${routePrefix}:${ip}`;
  const result = checkRateLimit(key, config);

  if (!result.allowed) {
    const retryAfter = Math.ceil(result.resetMs / 1000);
    return NextResponse.json(
      { error: "Trop de requetes. Reessayez dans quelques instants." },
      {
        status: 429,
        headers: {
          "Retry-After": retryAfter.toString(),
          "X-RateLimit-Limit": config.limit.toString(),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  return null;
}
