"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "@/components/SessionProvider";
import { ClientsTable } from "@/components/ClientsTable";
import { ClientBulkActionsBar } from "@/components/ClientBulkActionsBar";
import { ClientsListPagination } from "@/components/ClientsListPagination";
import { useTeseFilter } from "@/components/TeseFilterProvider";
import { TeseFilterBar } from "@/components/TeseFilterBar";
import { STATUS_OPTIONS } from "@/lib/client-fields";
import {
  DEFAULT_CLIENT_PAGE_SIZE,
  type ClientPageSize,
} from "@/lib/client-pagination";
import type { ClientStatus, ClientWorkflowStatus } from "@prisma/client";
import { WORKFLOW_OPTIONS } from "@/lib/client-fields";
import { Icon } from "@/components/ui/Icon";
import { TeamTodayPanel } from "@/components/TeamTodayPanel";
import { MeuDiaPanel } from "@/components/MeuDiaPanel";
import { PredictiveAlertBanner } from "@/components/PredictiveAlertBanner";

type ClientRow = {
  id: string;
  name: string;
  cod: string | null;
  cpf: string | null;
  tese: string | null;
  status: ClientStatus;
  workflowStatus: ClientWorkflowStatus;
  createdAt: string;
  primaryPhone: string | null;
  hasResearch: boolean;
  hasContacts: boolean;
  followUpAt?: string | null;
};

type DensityMode = "comfortable" | "cozy" | "compact";
type SavedFilter = {
  name: string;
  status: string;
  workflow: string;
  followUpDue: boolean;
  pesquisaFilter: string;
  sortBy: string;
  sortDir: "asc" | "desc";
};

function DashboardContent() {
  const { activeTeseId, activeTese, hydrated: teseHydrated } = useTeseFilter();
  const { user } = useSession();
  const isAdmin = user?.role === "ADMIN";
  const [teamLabel, setTeamLabel] = useState<string | null>(() => {
    if (user?.role === "ADMIN") return "Todas as equipes";
    return user?.teamName ?? null;
  });
  function readSavedFilters() {
    try {
      const raw = localStorage.getItem("dashboard-filters");
      return raw ? JSON.parse(raw) as { status?: string; workflow?: string; pageSize?: number } : {};
    } catch { return {}; }
  }

  function saveFilters(patch: { status?: string; workflow?: string; pageSize?: number }) {
    try {
      const current = readSavedFilters();
      localStorage.setItem("dashboard-filters", JSON.stringify({ ...current, ...patch }));
    } catch { /* ignore */ }
  }

  const [density, setDensity] = useState<DensityMode>(() => {
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem("dashboard-density") : null;
      return (saved as DensityMode) ?? "comfortable";
    } catch { return "comfortable"; }
  });

  function cycleDensity() {
    const next: DensityMode = density === "comfortable" ? "cozy" : density === "cozy" ? "compact" : "comfortable";
    setDensity(next);
    try { localStorage.setItem("dashboard-density", next); } catch { /* ignore */ }
  }

  const [savedFilterList, setSavedFilterList] = useState<SavedFilter[]>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("dashboard-saved-filters") : null;
      return raw ? JSON.parse(raw) as SavedFilter[] : [];
    } catch { return []; }
  });
  const [savingFilterOpen, setSavingFilterOpen] = useState(false);
  const [newFilterName, setNewFilterName] = useState("");

  function persistSavedFilterList(filters: SavedFilter[]) {
    setSavedFilterList(filters);
    try { localStorage.setItem("dashboard-saved-filters", JSON.stringify(filters)); } catch { /* ignore */ }
  }

  function handleSaveFilter() {
    const trimmed = newFilterName.trim();
    if (!trimmed) return;
    const entry: SavedFilter = {
      name: trimmed,
      status: statusFilter,
      workflow: workflowFilter,
      followUpDue,
      pesquisaFilter,
      sortBy,
      sortDir,
    };
    persistSavedFilterList([...savedFilterList, entry]);
    setNewFilterName("");
    setSavingFilterOpen(false);
  }

  function handleApplySavedFilter(f: SavedFilter) {
    setStatusFilter(f.status);
    setWorkflowFilter(f.workflow);
    setFollowUpDue(f.followUpDue);
    setPesquisaFilter(f.pesquisaFilter);
    setSortBy(f.sortBy);
    setSortDir(f.sortDir);
    setPage(1);
  }

  function handleDeleteSavedFilter(name: string) {
    persistSavedFilterList(savedFilterList.filter((f) => f.name !== name));
  }

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>(() => {
    try { return typeof window !== "undefined" ? (JSON.parse(localStorage.getItem("dashboard-filters") ?? "{}") as { status?: string }).status ?? "" : ""; } catch { return ""; }
  });
  const [workflowFilter, setWorkflowFilter] = useState<string>(() => {
    try { return typeof window !== "undefined" ? (JSON.parse(localStorage.getItem("dashboard-filters") ?? "{}") as { workflow?: string }).workflow ?? "" : ""; } catch { return ""; }
  });
  const [followUpDue, setFollowUpDue] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<ClientPageSize>(() => {
    try {
      const saved = typeof window !== "undefined" ? (JSON.parse(localStorage.getItem("dashboard-filters") ?? "{}") as { pageSize?: number }).pageSize : undefined;
      return (saved as ClientPageSize) ?? DEFAULT_CLIENT_PAGE_SIZE;
    } catch { return DEFAULT_CLIENT_PAGE_SIZE; }
  });
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [pesquisaFilter, setPesquisaFilter] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchAbort = useRef<AbortController | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (user?.role === "ADMIN") setTeamLabel("Todas as equipes");
    else if (user?.teamName) setTeamLabel(user.teamName);
  }, [user]);

  const loadClients = useCallback(async () => {
    if (!teseHydrated) return;

    fetchAbort.current?.abort();
    if (retryTimer.current) { clearTimeout(retryTimer.current); retryTimer.current = null; }
    const controller = new AbortController();
    fetchAbort.current = controller;

    setLoading(true);
    setFetchError(false);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (activeTeseId) params.set("teseId", activeTeseId);
      if (workflowFilter) params.set("workflowStatus", workflowFilter);
      if (followUpDue) params.set("followUpDue", "true");
      if (pesquisaFilter) params.set("pesquisaFilter", pesquisaFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (sortBy !== "updatedAt") params.set("sortBy", sortBy);
      if (sortDir !== "desc") params.set("sortDir", sortDir);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));

      const res = await fetch(`/api/clients?${params}`, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setClients(data.clients ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
      if (data.page && data.page !== page) setPage(data.page);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      if (!controller.signal.aborted) {
        setFetchError(true);
        retryTimer.current = setTimeout(() => {
          retryTimer.current = null;
          void loadClients();
        }, 2000);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [teseHydrated, statusFilter, workflowFilter, followUpDue, pesquisaFilter, activeTeseId, searchQuery, page, pageSize, sortBy, sortDir]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeTeseId, statusFilter, workflowFilter, followUpDue, pesquisaFilter, searchQuery, page, pageSize, sortBy, sortDir]);

  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
      if (retryTimer.current) clearTimeout(retryTimer.current);
      fetchAbort.current?.abort();
    };
  }, []);

  function handleSearchChange(value: string) {
    setSearchInput(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearchQuery(value);
      setPage(1);
    }, 400);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      if (prev.size === clients.length) return new Set();
      return new Set(clients.map((c) => c.id));
    });
  }

  const bulkExportHref =
    selectedIds.size > 0
      ? `/api/reports/export?ids=${Array.from(selectedIds).join(",")}${
          activeTeseId ? `&teseId=${activeTeseId}` : ""
        }`
      : null;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Painel de clientes</h1>
          {teamLabel && <p className="page-subtitle">Equipe: {teamLabel}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TeseFilterBar embedded />
          <Link href="/clients/new" className="btn-primary">
            <Icon name="userPlus" className="h-4 w-4" />
            Novo cliente
          </Link>
        </div>
      </div>

      <PredictiveAlertBanner />

      <MeuDiaPanel />

      <TeamTodayPanel />

      <div className="filter-bar">
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="industrial-input min-w-[140px] flex-1"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              saveFilters({ status: e.target.value });
              setPage(1);
            }}
          >
            <option value="">Todos os status</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <select
            className="industrial-input min-w-[140px] flex-1"
            value={workflowFilter}
            onChange={(e) => {
              setWorkflowFilter(e.target.value);
              saveFilters({ workflow: e.target.value });
              setPage(1);
            }}
          >
            <option value="">Todas finalizações</option>
            {WORKFLOW_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              setFollowUpDue((v) => !v);
              setPage(1);
            }}
            className={`btn-ghost shrink-0 text-xs ${followUpDue ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400" : ""}`}
            title="Mostrar apenas clientes com retorno vencido ou de hoje"
          >
            <Icon name="bell" className="h-3.5 w-3.5" />
            {followUpDue ? "Follow-ups ativos" : "Follow-ups"}
          </button>
          <select
            className="industrial-input min-w-[150px] flex-1"
            value={pesquisaFilter}
            onChange={(e) => {
              setPesquisaFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Toda pesquisa</option>
            <option value="none">Sem pesquisa</option>
            <option value="done">Pesquisa feita</option>
            <option value="contacts">Com contatos</option>
          </select>
          <div className="relative min-w-[180px] flex-[2]">
            <Icon
              name="search"
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted"
            />
            <input
              type="search"
              className="industrial-input w-full"
              style={{ paddingLeft: "2.25rem" }}
              placeholder="Nome, COD, CPF, telefone..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          <button type="button" className="btn-ghost shrink-0" onClick={loadClients}>
            Atualizar
          </button>
          <button
            type="button"
            onClick={cycleDensity}
            className="btn-ghost shrink-0 text-xs"
            title="Alternar densidade da tabela"
          >
            <Icon name="rows" className="h-3.5 w-3.5" />
            {density === "comfortable" ? "Confortável" : density === "cozy" ? "Intermediário" : "Compacto"}
          </button>
        </div>

        {/* Saved filters row */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          {savedFilterList.map((f) => (
            <span
              key={f.name}
              className="flex items-center gap-1 rounded-full border border-border bg-surface-elevated px-2.5 py-0.5 text-xs"
            >
              <button
                type="button"
                onClick={() => handleApplySavedFilter(f)}
                className="text-foreground hover:text-primary transition-colors"
              >
                {f.name}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteSavedFilter(f.name)}
                className="text-muted hover:text-foreground transition-colors"
                aria-label={`Remover filtro ${f.name}`}
              >
                <Icon name="x" className="h-3 w-3" />
              </button>
            </span>
          ))}
          {savingFilterOpen ? (
            <form
              onSubmit={(e) => { e.preventDefault(); handleSaveFilter(); }}
              className="flex items-center gap-1"
            >
              <input
                type="text"
                autoFocus
                className="industrial-input h-7 px-2 py-1 text-xs min-w-[140px]"
                placeholder="Nome do filtro..."
                value={newFilterName}
                onChange={(e) => setNewFilterName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") { setSavingFilterOpen(false); setNewFilterName(""); }
                }}
              />
              <button type="submit" className="btn-ghost h-7 px-2 text-xs">
                Salvar
              </button>
              <button
                type="button"
                className="btn-ghost h-7 px-2 text-xs"
                onClick={() => { setSavingFilterOpen(false); setNewFilterName(""); }}
              >
                <Icon name="x" className="h-3 w-3" />
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setSavingFilterOpen(true)}
              className="btn-ghost shrink-0 text-xs"
            >
              <Icon name="bookmark" className="h-3.5 w-3.5" />
              Salvar filtro
            </button>
          )}
        </div>
      </div>

      {fetchError && !loading && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-700 dark:text-amber-400">
          <Icon name="alert" className="h-4 w-4 shrink-0" />
          <span className="flex-1">Erro ao carregar clientes. Tentando novamente...</span>
          <button type="button" className="btn-ghost text-xs" onClick={loadClients}>
            Tentar agora
          </button>
        </div>
      )}

      {selectedIds.size > 0 && (
        <ClientBulkActionsBar
          selectedCount={selectedIds.size}
          totalCount={clients.length}
          selectedIds={selectedIds}
          onSelectAll={toggleSelectAll}
          onClear={() => setSelectedIds(new Set())}
          exportCsvHref={bulkExportHref}
          canDelete={user?.role === "ADV" || user?.role === "ADMIN"}
          onDeleteSuccess={loadClients}
        />
      )}

      <ClientsTable
        clients={clients}
        loading={loading}
        emptyMessage={
          searchQuery.trim()
            ? "Nenhum cliente encontrado para esta busca."
            : "Nenhum cliente cadastrado."
        }
        selectable
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
        sortBy={sortBy}
        sortDir={sortDir}
        density={density}
        onSort={(col) => {
          if (col === sortBy) {
            setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
          } else {
            setSortBy(col);
            setSortDir("asc");
          }
          setPage(1);
        }}
      />

      <ClientsListPagination
          page={page}
          pageSize={pageSize}
          total={total}
          totalPages={totalPages}
          disabled={loading}
          onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          saveFilters({ pageSize: size });
          setPage(1);
        }}
      />
    </>
  );
}

export default function DashboardPage() {
  return <DashboardContent />;
}
