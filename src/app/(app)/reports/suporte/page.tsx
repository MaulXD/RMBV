"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useSession } from "@/components/SessionProvider";
import { Icon } from "@/components/ui/Icon";

type SupportRequest = {
  id: string;
  name: string;
  sala: string;
  necessidade: string;
  obs: string | null;
  email: string | null;
  createdAt: string;
  requester: { name: string; email: string } | null;
};

type Stats = {
  total: number;
  totalPeriodo: number;
  porNecessidade: { necessidade: string; count: number }[];
};

export default function ReportsSuportePage() {
  const { user } = useSession();
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      params.set("page", String(page));

      const res = await fetch(`/api/support-requests?${params}`);
      const data = await res.json();
      setRequests(data.requests);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setStats(data.stats);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, startDate, endDate, page]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  if (!user || (user.role !== "ADMIN" && user.role !== "ADV")) return null;

  return (
    <div>
      <PageHeader
        icon="ticket"
        title="Relatório de Suporte"
        subtitle="Acompanhamento de solicitações de suporte técnico"
      />

      {stats && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-surface-elevated p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">Total</p>
            <p className="mt-1 text-2xl font-bold text-foreground tabular-nums">{stats.total}</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface-elevated p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">No período</p>
            <p className="mt-1 text-2xl font-bold text-foreground tabular-nums">{stats.totalPeriodo}</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface-elevated p-4 shadow-sm sm:col-span-2">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted">Por necessidade</p>
            <div className="flex flex-wrap gap-1.5">
              {stats.porNecessidade.slice(0, 6).map((n) => (
                <span key={n.necessidade} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                  {n.necessidade}
                  <span className="tabular-nums text-muted">{n.count}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mb-5 rounded-2xl border border-border bg-surface-elevated p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1 sm:max-w-xs">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-muted">Buscar</label>
            <input
              className="industrial-input w-full"
              placeholder="Nome, sala, necessidade..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-muted">De</label>
            <input type="date" className="industrial-input" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-muted">Até</label>
            <input type="date" className="industrial-input" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} />
          </div>
          {(startDate || endDate || search) && (
            <button type="button" className="btn-ghost self-end px-3 py-2 text-xs" onClick={() => { setSearch(""); setStartDate(""); setEndDate(""); setPage(1); }}>
              Limpar
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface-elevated shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-elevated/50">
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-widest text-muted">Data</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-widest text-muted">Nome</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-widest text-muted">Sala</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-widest text-muted">Necessidade</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-widest text-muted">Observação</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-widest text-muted">E-mail</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 w-full animate-pulse rounded bg-border/50" /></td>
                    ))}
                  </tr>
                ))
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted">
                    Nenhuma solicitação encontrada
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-primary/[0.03]">
                    <td className="whitespace-nowrap px-4 py-2.5 text-xs tabular-nums text-muted">
                      {new Date(r.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-medium text-foreground">{r.name}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted">{r.sala}</td>
                    <td className="max-w-[200px] truncate px-4 py-2.5 text-muted" title={r.necessidade}>{r.necessidade}</td>
                    <td className="max-w-[200px] truncate px-4 py-2.5 text-muted" title={r.obs ?? ""}>{r.obs ?? "-"}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted">{r.email ?? r.requester?.email ?? "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-xs text-muted">
              {total} solicitação{(total !== 1 ? "ões" : "")}
            </p>
            <div className="flex items-center gap-1">
              <button type="button" className="btn-ghost px-2 py-1 text-xs" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <Icon name="chevronLeft" className="h-4 w-4" />
              </button>
              <span className="px-2 text-xs tabular-nums text-muted">{page} / {totalPages}</span>
              <button type="button" className="btn-ghost px-2 py-1 text-xs" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                <Icon name="chevronRight" className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
