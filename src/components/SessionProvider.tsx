"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "ADV" | "GERENTE" | "COLABORADOR";
  teamId: string | null;
  teamName: string | null;
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

/** Pré-popula o cache após login e persiste no localStorage. */
export function primeSessionCache(user: SessionUser | null) {
  sessionCache = user;
  writeStorage(user);
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(() => {
    if (sessionCache !== undefined) return sessionCache;
    const stored = readStorage();
    if (stored) sessionCache = stored;
    return stored;
  });
  const [loading, setLoading] = useState(() => {
    if (sessionCache !== undefined) return false;
    return !readStorage();
  });

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      const next = (data.user ?? null) as SessionUser | null;
      sessionCache = next;
      writeStorage(next);
      setUser(next);
    } catch {
      sessionCache = null;
      writeStorage(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Always validate against server — localStorage is just for instant first render
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
