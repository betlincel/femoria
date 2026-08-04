const WINDOW_MS = 60_000;
const MAX_REQUESTS = 8;

interface RateEntry {
  count: number;
  resetAt: number;
}

const entries = new Map<string, RateEntry>();

export function checkAssistantRateLimit(key: string, now = Date.now()): {
  allowed: boolean;
  retryAfterSeconds: number;
} {
  const current = entries.get(key);
  if (!current || current.resetAt <= now) {
    entries.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (current.count >= MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }
  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

