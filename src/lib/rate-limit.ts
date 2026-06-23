type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();
const WINDOW_MS = 15 * 60 * 1000; // 15 min
const MAX_ATTEMPTS = 10;

const CONFIGS: Record<string, { windowMs: number; max: number }> = {
  login: { windowMs: 15 * 60 * 1000, max: 10 },
  "ponto-match": { windowMs: 60 * 1000, max: 120 }, // 2 scans/sec sustained from kiosk
};

export function checkRateLimit(
  key: string,
  type?: keyof typeof CONFIGS,
): { allowed: boolean; remaining: number; retryAfterSecs: number } {
  const cfg = (type ? CONFIGS[type] : undefined) ?? { windowMs: WINDOW_MS, max: MAX_ATTEMPTS };
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + cfg.windowMs });
    return { allowed: true, remaining: cfg.max - 1, retryAfterSecs: 0 };
  }

  entry.count++;

  if (entry.count > cfg.max) {
    const retryAfterSecs = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSecs };
  }

  return { allowed: true, remaining: cfg.max - entry.count, retryAfterSecs: 0 };
}

export function resetRateLimit(key: string) {
  store.delete(key);
}
