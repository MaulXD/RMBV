"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "ADV" | "GERENTE" | "TI" | "COLABORADOR" | "PESQUISADOR";
  teamId: string | null;
  teamName: string | null;
  avatarUrl: string | null;
  mustChangePassword?: boolean;
  hasFace?: boolean;
  hasFaceConsent?: boolean;
  workType?: "ESTAGIARIO" | "CLT";
  gpsRequired?: boolean;
};

type SessionContextValue = {
  user: SessionUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

const STORAGE_KEY = "gestao_user_v1";

function readStorage(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as SessionUser | null;
  } catch { return null; }
}

function writeStorage(u: SessionUser | null) {
  if (typeof window === "undefined") return;
  try {
    if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

/** In-memory cache: persists across soft navigations within the same tab. */
let sessionCache: SessionUser | null | undefined;

/**
 * Subscriber set by the mounted SessionProvider so primeSessionCache
 * can update React state immediately — without requiring a full page reload.
 */
let sessionSubscriber: ((u: SessionUser | null) => void) | null = null;

/** Pré-popula o cache após login e persiste no localStorage. */
export function primeSessionCache(user: SessionUser | null) {
  sessionCache = user;
  writeStorage(user);
  sessionSubscriber?.(user);
}

function getLocalUser(): SessionUser | null {
  // Module-level cache takes priority (avoids redundant localStorage reads)
  if (sessionCache !== undefined) return sessionCache;
  const stored = readStorage();
  sessionCache = stored;
  return stored;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  // Start with null — safe for SSR (no hydration mismatch with server HTML).
  // The real value from localStorage is applied synchronously before first paint
  // via useLayoutEffect, so there is no visible flash for authenticated users.
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(false);

  // Register as subscriber so primeSessionCache() can push state updates
  // immediately into React (e.g. right after login + router.push without F5).
  useEffect(() => {
    sessionSubscriber = setUser;
    return () => {
      if (sessionSubscriber === setUser) sessionSubscriber = null;
    };
  }, []);

  // Read from localStorage BEFORE the first browser paint.
  // useLayoutEffect fires synchronously after React's DOM mutations but before
  // the browser repaints — the user sees their nav items immediately, not after
  // the server /api/auth/me round-trip.
  // On the server this is a no-op (typeof window === "undefined").
  useLayoutEffect(() => {
    const cached = getLocalUser();
    if (cached !== null) setUser(cached);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.status === 401) {
        sessionCache = null;
        writeStorage(null);
        setUser(null);
      } else if (res.ok) {
        const data = await res.json() as { user?: SessionUser };
        const next = data.user ?? null;
        sessionCache = next;
        writeStorage(next);
        setUser(next);
      }
      // 4xx/5xx that are not 401: preserve session in cache (e.g. Neon cold start → 500)
    } catch {
      // Network error: preserve session in cache, don't log out
    } finally {
      setLoading(false);
    }
  }, []);

  // Verify/update session from server on mount.
  // Runs AFTER useLayoutEffect, so localStorage data is already in state.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ user, loading, refresh }),
    [user, loading, refresh]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession deve ser usado dentro de SessionProvider");
  }
  return ctx;
}
