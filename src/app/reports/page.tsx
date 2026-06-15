"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useTeseFilter } from "@/components/TeseFilterProvider";
import { STATUS_OPTIONS } from "@/lib/client-fields";

type Stats = {
  total: number;
  byStatus: { status: string; label: string; count: number }[];
};

function ReportsContent() {
  const { activeTeseId, activeTese } = useTeseFilter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  const loadStats = useCallback(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (activeTeseId) params.set("teseId", activeTeseId);
    const qs = params.toString() ? `?${params}` : "";
    fetch(`/api/reports/stats${qs}`)
      .then((r) => r.json())
      .then((d) => setStats(d));
  }, [statusFilter, activeTeseId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  function exportUrl(format: "csv" | "pdf") {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (activeTeseId) params.set("teseId", activeTeseId);
    const qs = params.toString() ? `?${params}` : "";
    return format === "csv" ? `/api/reports/export${qs}` : `/api/reports/pdf${qs}`;
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-wide">Relatórios</h1>
        <p className="mt-1 text-sm text-muted">
          {activeTese
            ? `Dados filtrados pela tese: ${activeTese.name}`
            : "Resumo geral — use os botões de tese acima para filtrar"}
        </p>
      </div>

      {stats && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="industrial-panel p-4">
            <p className="text-xs text-muted uppercase">Total</p>
            <p className="mt-1 text-2xl font-semibold">{stats.total}</p>
          </div>
          {stats.byStatus.map((item) => (
            <div key={item.status} className="industrial-panel p-4">
              <p className="text-xs text-muted uppercase">{item.label}</p>
              <p className="mt-1 text-2xl font-semibold">{item.count}</p>
            </div>
          ))}
        </div>
      )}

      <section className="industrial-panel max-w-lg space-y-4 p-6">
        <h2 className="text-sm font-medium">Exportar dados</h2>
        <p className="text-xs text-muted">
          Exportações respeitam a tese ativa e o filtro de status abaixo.
        </p>

        <div>
          <label className="mb-1 block text-xs text-muted">Filtrar por status (opcional)</label>
          <select
            className="industrial-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Todos</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          <a href={exportUrl("csv")} className="btn-ghost">
            Baixar CSV
          </a>
          <a href={exportUrl("pdf")} className="btn-primary" target="_blank" rel="noreferrer">
            Relatório PDF
          </a>
        </div>
      </section>
    </>
  );
}

export default function ReportsPage() {
  return (
    <AppShell>
      <ReportsContent />
    </AppShell>
  );
}
