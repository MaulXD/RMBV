"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
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

function DashboardContent() {
  const { activeTeseId, activeTese } = useTeseFilter();
  const { user } = useSession();
  const isAdmin = user?.role === "ADMIN";
  const [teamLabel, setTeamLabel] = useState<string | null>(() => {
    if (user?.role === "ADMIN") return "Todas as equipes";
    return user?.teamName ?? null;
  });
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [workflowFilter, setWorkflowFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<ClientPageSize>(DEFAULT_CLIENT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (user?.role === "ADMIN") setTeamLabel("Todas as equipes");
    else if (user?.teamName) setTeamLabel(user.teamName);
  }, [user]);

  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (activeTeseId) params.set("teseId", activeTeseId);
      if (workflowFilter) params.set("workflowStatus", workflowFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));

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
  }, [statusFilter, workflowFilter, activeTeseId, searchQuery, page, pageSize]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeTeseId, statusFilter, workflowFilter, searchQuery, page, pageSize]);

  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
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

      <TeamTodayPanel />

      <div className="filter-bar">
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="industrial-input min-w-[140px] flex-1"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
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
        </div>
      </div>

      {isAdmin && (
        <ClientBulkActionsBar
          selectedCount={selectedIds.size}
          totalCount={clients.length}
          onSelectAll={toggleSelectAll}
          onClear={() => setSelectedIds(new Set())}
          exportCsvHref={bulkExportHref}
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
        selectable={isAdmin}
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
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
    </>
  );
}

export default function DashboardPage() {
  return (
    <AppShell>
      <DashboardContent />
    </AppShell>
  );
}
