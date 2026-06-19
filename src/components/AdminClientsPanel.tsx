"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ClientsTable } from "./ClientsTable";
import { ClientsListPagination } from "./ClientsListPagination";
import { Icon } from "./ui/Icon";
import {
  DEFAULT_CLIENT_PAGE_SIZE,
  type ClientPageSize,
} from "@/lib/client-pagination";
import { STATUS_OPTIONS } from "@/lib/client-fields";
import type { ClientStatus, ClientWorkflowStatus } from "@prisma/client";

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
};

type Team = { id: string; name: string };
type Tese = { id: string; name: string; color: string | null };

export function AdminClientsPanel({ teams }: { teams: Team[] }) {
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [teses, setTeses] = useState<Tese[]>([]);
  const [teseFilter, setTeseFilter] = useState("");
  const [noTese, setNoTese] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<ClientPageSize>(DEFAULT_CLIENT_PAGE_SIZE);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Bulk assign tese state
  const [assignTeseId, setAssignTeseId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignResult, setAssignResult] = useState<string | null>(null);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load teses when team changes
  useEffect(() => {
    if (!teamId) return;
    setTeses([]);
    setTeseFilter("");
    setAssignTeseId("");
    fetch(`/api/teses?teamId=${teamId}`)
      .then((r) => r.json())
      .then((d) => setTeses(d.teses ?? []));
  }, [teamId]);

  // Load clients
  const loadClients = useCallback(async () => {
    if (!teamId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("teamId", teamId);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (statusFilter) params.set("status", statusFilter);
      if (noTese) {
        params.set("noTese", "true");
      } else if (teseFilter) {
        params.set("teseId", teseFilter);
      }
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/clients?${params}`);
      const data = await res.json();
      if (res.ok) {
        setClients(data.clients ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
        if (data.page && data.page !== page) setPage(data.page);
      }
    } finally {
      setLoading(false);
    }
  }, [teamId, page, pageSize, statusFilter, teseFilter, noTese, searchQuery]);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [teamId, teseFilter, noTese, statusFilter, searchQuery, page]);

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
    setSelectedIds((prev) =>
      prev.size === clients.length ? new Set() : new Set(clients.map((c) => c.id))
    );
  }

  async function handleBulkAssignTese() {
    if (!assignTeseId && !confirm("Isso vai remover a tese dos clientes selecionados. Confirmar?")) return;
    setAssigning(true);
    setAssignResult(null);
    try {
      const res = await fetch("/api/clients/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          teseId: assignTeseId || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAssignResult(`${data.updated} cliente(s) atualizados.`);
        setSelectedIds(new Set());
        void loadClients();
      } else {
        setAssignResult(data.error ?? "Erro ao atribuir tese.");
      }
    } finally {
      setAssigning(false);
    }
  }

  const teamLabel = teams.find((t) => t.id === teamId)?.name ?? "";

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="filter-bar flex flex-wrap items-end gap-3">
        <div className="min-w-[160px]">
          <label className="mb-1 block text-xs text-muted">Equipe</label>
          <select
            className="industrial-input"
            value={teamId}
            onChange={(e) => { setTeamId(e.target.value); setPage(1); }}
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="min-w-[160px]">
          <label className="mb-1 block text-xs text-muted">Tese</label>
          <select
            className="industrial-input"
            value={noTese ? "__none__" : teseFilter}
            onChange={(e) => {
              if (e.target.value === "__none__") {
                setNoTese(true);
                setTeseFilter("");
              } else {
                setNoTese(false);
                setTeseFilter(e.target.value);
              }
              setPage(1);
            }}
          >
            <option value="">Todas</option>
            <option value="__none__">Sem tese</option>
            {teses.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="min-w-[140px]">
          <label className="mb-1 block text-xs text-muted">Status</label>
          <select
            className="industrial-input"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">Todos</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div className="relative min-w-[180px] flex-1">
          <label className="mb-1 block text-xs text-muted">Buscar</label>
          <div className="relative">
            <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              className="industrial-input w-full"
              style={{ paddingLeft: "2.25rem" }}
              placeholder="Nome, COD, CPF..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
        </div>

        <button type="button" className="btn-ghost self-end" onClick={loadClients}>
          Atualizar
        </button>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-sm text-muted">
        <span>
          {loading ? "Carregando..." : `${total.toLocaleString("pt-BR")} cliente(s)${noTese ? " sem tese" : teseFilter ? ` — ${teses.find((t) => t.id === teseFilter)?.name ?? ""}` : ""} em ${teamLabel}`}
        </span>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
          <span className="text-sm font-medium text-foreground">
            {selectedIds.size} selecionado(s)
          </span>
          <button
            type="button"
            className="btn-ghost text-xs"
            onClick={() => setSelectedIds(new Set())}
          >
            Limpar
          </button>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {assignResult && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400">{assignResult}</span>
            )}
            <select
              className="industrial-input text-sm"
              value={assignTeseId}
              onChange={(e) => setAssignTeseId(e.target.value)}
            >
              <option value="">Remover tese</option>
              {teses.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <button
              type="button"
              className="btn-primary text-sm"
              disabled={assigning}
              onClick={handleBulkAssignTese}
            >
              <Icon name="layers" className="h-4 w-4" />
              {assigning ? "Aplicando..." : assignTeseId ? "Atribuir tese" : "Remover tese"}
            </button>
          </div>
        </div>
      )}

      <ClientsTable
        clients={clients}
        loading={loading}
        emptyMessage="Nenhum cliente encontrado."
        selectable
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
      />

      <ClientsListPagination
        page={page}
        pageSize={pageSize}
        total={total}
        totalPages={totalPages}
        disabled={loading}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
      />
    </div>
  );
}
