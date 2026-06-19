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
  // Start with in-memory cache only — avoids SSR/client hydration mismatch
  const [user, setUser] = useState<SessionUser | null>(
    sessionCache !== undefined ? sessionCache : null
  );
  const [loading, setLoading] = useState(sessionCache === undefined);

  // Read localStorage synchronously before first paint, but AFTER hydration
  useLayoutEffect(() => {
    if (sessionCache !== undefined) return;
    const stored = readStorage();
    if (stored) {
      sessionCache = stored;
      setUser(stored);
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.status === 401) {
        // Sessão expirada ou token inválido — logout explícito
        sessionCache = null;
        writeStorage(null);
        setUser(null);
      } else if (res.ok) {
        const data = await res.json();
        const next = (data.user ?? null) as SessionUser | null;
        sessionCache = next;
        writeStorage(next);
        setUser(next);
      }
      // 4xx/5xx que não sejam 401: preserva sessão em cache
    } catch {
      // Erro de rede: preserva sessão em cache, não desloga
    } finally {
      setLoading(false);
    }
  }, []);

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
