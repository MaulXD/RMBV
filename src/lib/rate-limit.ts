type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();
const WINDOW_MS = 15 * 60 * 1000; // 15 min
const MAX_ATTEMPTS = 10;

export function checkRateLimit(key: string): { allowed: boolean; remaining: number; retryAfterSecs: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1, retryAfterSecs: 0 };
  }

  entry.count++;

  if (entry.count > MAX_ATTEMPTS) {
    const retryAfterSecs = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSecs };
  }

  return { allowed: true, remaining: MAX_ATTEMPTS - entry.count, retryAfterSecs: 0 };
}

export function resetRateLimit(key: string) {
  store.delete(key);
}
