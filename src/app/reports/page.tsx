"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useTeseFilter } from "@/components/TeseFilterProvider";
import { STATUS_OPTIONS } from "@/lib/client-fields";

type Stats = {
  total: number;
  byStatus: { status: string; label: string; count: number }[];
};

const METRIC_STYLES: Record<
  string,
  { valueClass: string; accentBorder: boolean; barClass: string }
> = {
  total: {
    valueClass: "text-primary",
    accentBorder: true,
    barClass: "bg-primary",
  },
  AGUARDANDO: {
    valueClass: "text-muted",
    accentBorder: false,
    barClass: "bg-slate-400",
  },
  LOCALIZADO: {
    valueClass: "text-emerald-600 dark:text-emerald-400",
    accentBorder: false,
    barClass: "bg-emerald-400",
  },
  SEM_SUCESSO: {
    valueClass: "text-red-600 dark:text-red-400",
    accentBorder: false,
    barClass: "bg-red-400",
  },
  TENTE_NOVAMENTE: {
    valueClass: "text-amber-700 dark:text-amber-400",
    accentBorder: false,
    barClass: "bg-amber-400",
  },
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

  const total = stats?.total ?? 0;

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-xl font-semibold tracking-wide">Relatórios</h1>
        <p className="mt-1 text-sm text-muted">
          {activeTese
            ? `Dados filtrados pela tese: ${activeTese.name}`
            : "Resumo geral — use o seletor de tese no topo"}
        </p>
      </div>

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <div
            className={`industrial-panel flex flex-col gap-2 p-5 ${
              METRIC_STYLES.total.accentBorder
                ? "border-primary/30 bg-gradient-to-br from-surface-elevated to-primary/5"
                : ""
            }`}
          >
            <span className="text-[11px] font-semibold tracking-widest text-muted uppercase">
              Total
            </span>
            <span className={`text-3xl leading-none font-extrabold ${METRIC_STYLES.total.valueClass}`}>
              {total.toLocaleString("pt-BR")}
            </span>
          </div>

          {stats.byStatus.map((item) => {
            const style = METRIC_STYLES[item.status] ?? METRIC_STYLES.AGUARDANDO;
            const pct = total > 0 ? (item.count / total) * 100 : 0;
            return (
              <div key={item.status} className="industrial-panel flex flex-col gap-2 p-5">
                <span className="text-[11px] font-semibold tracking-widest text-muted uppercase">
                  {item.label}
                </span>
                <span className={`text-3xl leading-none font-extrabold ${style.valueClass}`}>
                  {item.count.toLocaleString("pt-BR")}
                </span>
                <div className="mt-1 h-0.5 overflow-hidden rounded-full bg-border">
                  <div
                    className={`h-full rounded-full opacity-50 transition-all duration-500 ${style.barClass}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <section className="industrial-panel max-w-lg space-y-4 p-5">
        <h2 className="font-semibold text-foreground">Exportar dados</h2>
        <p className="text-sm text-muted">
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
