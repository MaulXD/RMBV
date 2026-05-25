"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { STATUS_OPTIONS } from "@/lib/client-fields";

type Stats = {
  total: number;
  byStatus: { status: string; label: string; count: number }[];
};

export default function ReportsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    fetch("/api/reports/stats")
      .then((r) => r.json())
      .then((d) => setStats(d));
  }, []);

  function handleExport() {
    const qs = statusFilter ? `?status=${statusFilter}` : "";
    window.location.href = `/api/reports/export${qs}`;
  }

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-wide">Relatórios</h1>
        <p className="mt-1 text-sm text-muted">
          Resumo por status e exportação CSV no formato do modelo
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
          Gera CSV com COD, TESE, NOME, CPF, telefones, endereços e STATUS.
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

        <button type="button" className="btn-primary" onClick={handleExport}>
          Baixar CSV
        </button>
      </section>
    </AppShell>
  );
}
