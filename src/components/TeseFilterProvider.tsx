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

// Cache de módulo: persiste durante toda a sessão do browser, sobrevive a
// remontagens do TeseFilterProvider causadas por navegação entre páginas.
// undefined = ainda não lido; null = "Todas"; string = ID da tese ativa.
let _cachedTeseId: string | null | undefined = undefined;

function readStoredTeseId(): string | null {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s && s !== "all" ? s : null;
  } catch { return null; }
}

export function TeseFilterProvider({ children }: { children: ReactNode }) {
  const [teses, setTeses] = useState<TeseItem[]>([]);

  // Leitura síncrona do cache de módulo: em navegações subsequentes,
  // _cachedTeseId já está preenchido → hydrated=true imediatamente,
  // eliminando o delay e o possível fetch duplo.
  const [activeTeseId, setActiveTeseIdState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;   // SSR
    if (_cachedTeseId !== undefined) return _cachedTeseId;
    return null; // primeira carga: será lido no useEffect
  });

  const [hydrated, setHydrated] = useState(() => {
    if (typeof window === "undefined") return false;
    return _cachedTeseId !== undefined; // true em navegações subsequentes
  });

  const [loading, setLoading] = useState(true);

  const refreshTeses = useCallback(async () => {
    const res = await fetch("/api/teses");
    const data = await res.json();
    if (res.ok) setTeses(data.teses ?? []);
  }, []);

  // Roda apenas uma vez por montagem; em navegações subsequentes
  // _cachedTeseId já está preenchido, então apenas confirma hydrated=true.
  useEffect(() => {
    if (_cachedTeseId === undefined) {
      const id = readStoredTeseId();
      _cachedTeseId = id;
      setActiveTeseIdState(id);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    refreshTeses().finally(() => setLoading(false));
  }, [refreshTeses]);

  const setActiveTeseId = useCallback((id: string | null) => {
    _cachedTeseId = id; // mantém o cache em sincronia
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
