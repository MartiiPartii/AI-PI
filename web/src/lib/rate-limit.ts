/**
 * Minimal in-memory fixed-window rate limiter.
 *
 * Good enough to blunt brute-force login attempts in this single-instance demo.
 * It is per-process and resets on restart — a production deployment behind
 * multiple instances should use a shared store (e.g. Redis) instead.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  readonly allowed: boolean;
  /** Seconds until the window resets (only meaningful when blocked). */
  readonly retryAfterSeconds: number;
}

/**
 * Records an attempt for `key` and reports whether it is allowed.
 *
 * @param key      identifier to limit on (e.g. `login:<ip>:<phone>`)
 * @param limit    max attempts per window
 * @param windowMs window length in milliseconds
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}
