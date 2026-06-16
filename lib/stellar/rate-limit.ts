interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

const PRIVATE_HEADER_KEY = /[^a-z0-9:.\-_]/i;

export function clientKey(headers: Headers): string {
  const cf = headers.get("cf-connecting-ip");
  if (cf && !PRIVATE_HEADER_KEY.test(cf)) return cf;
  const fwd = headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0].trim();
    if (first && !PRIVATE_HEADER_KEY.test(first)) return first;
  }
  return "unknown";
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitResult {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    const fresh: Bucket = { count: 1, resetAt: now + windowMs };
    buckets.set(key, fresh);
    return { allowed: true, remaining: limit - 1, resetAt: fresh.resetAt };
  }
  bucket.count += 1;
  const allowed = bucket.count <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
  };
}

export function _resetRateLimitForTests(): void {
  buckets.clear();
}
