/**
 * Simple in-memory sliding-window rate limiter.
 *
 * Suitable for single-process deployments (dev + Vercel serverless via module-
 * cache persistence). For multi-instance deployments swap the store for Redis.
 */

interface RateRecord {
  count: number;
  resetAt: number; // epoch ms
}

const store = new Map<string, RateRecord>();

// Periodically clean up expired entries to prevent memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, rec] of store.entries()) {
      if (now > rec.resetAt) store.delete(key);
    }
  }, 60_000);
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number; // seconds until window resets (0 if allowed)
}

/**
 * @param key       Unique identifier for the bucket (e.g. `${userId}:${route}`)
 * @param limit     Max requests allowed in the window
 * @param windowMs  Window size in milliseconds
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const rec = store.get(key);

  if (!rec || now > rec.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfter: 0 };
  }

  if (rec.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((rec.resetAt - now) / 1000),
    };
  }

  rec.count++;
  return { allowed: true, remaining: limit - rec.count, retryAfter: 0 };
}
