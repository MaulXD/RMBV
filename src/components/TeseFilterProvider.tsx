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

export type TeseItem = {
  id: string;
  name: string;
  teamId?: string | null;
  color: string | null;
  sortOrder: number;
  _count?: { clients: number };
};

type TeseFilterContextValue = {
  teses: TeseItem[];
  activeTeseId: string | null;
  activeTese: TeseItem | null;
  setActiveTeseId: (id: string | null) => void;
  refreshTeses: () => Promise<void>;
  loading: boolean;
  hydrated: boolean;
};

const TeseFilterContext = createContext<TeseFilterContextValue | null>(null);
const STORAGE_KEY = "gestao-tese-ativa";

export function TeseFilterProvider({ children }: { children: ReactNode }) {
  const [teses, setTeses] = useState<TeseItem[]>([]);
  const [activeTeseId, setActiveTeseIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  const refreshTeses = useCallback(async () => {
    const res = await fetch("/api/teses");
    const data = await res.json();
    if (res.ok) setTeses(data.teses ?? []);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setActiveTeseIdState(stored === "all" ? null : stored);
    setHydrated(true);
  }, []);

  useEffect(() => {
    refreshTeses().finally(() => setLoading(false));
  }, [refreshTeses]);

  const setActiveTeseId = useCallback((id: string | null) => {
    setActiveTeseIdState(id);
    localStorage.setItem(STORAGE_KEY, id ?? "all");
  }, []);

  const activeTese = useMemo(
    () => teses.find((t) => t.id === activeTeseId) ?? null,
    [teses, activeTeseId]
  );

  const value = useMemo(
    () => ({
      teses,
      activeTeseId: hydrated ? activeTeseId : null,
      activeTese,
      setActiveTeseId,
      refreshTeses,
      loading,
      hydrated,
    }),
    [teses, activeTeseId, activeTese, setActiveTeseId, refreshTeses, loading, hydrated]
  );

  return <TeseFilterContext.Provider value={value}>{children}</TeseFilterContext.Provider>;
}

export function useTeseFilter() {
  const ctx = useContext(TeseFilterContext);
  if (!ctx) throw new Error("useTeseFilter deve ser usado dentro de TeseFilterProvider");
  return ctx;
}
