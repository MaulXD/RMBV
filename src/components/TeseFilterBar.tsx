"use client";

import Link from "next/link";
import { useTeseFilter } from "./TeseFilterProvider";

export function TeseFilterBar({ showPdfButton = false, statusFilter = "" }: {
  showPdfButton?: boolean;
  statusFilter?: string;
}) {
  const { teses, activeTeseId, setActiveTeseId, loading, activeTese } = useTeseFilter();

  function pdfUrl() {
    const params = new URLSearchParams();
    if (activeTeseId) params.set("teseId", activeTeseId);
    if (statusFilter) params.set("status", statusFilter);
    const qs = params.toString();
    return `/api/reports/pdf${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="border-b border-border bg-surface-elevated">
      <div className="mx-auto max-w-6xl px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold tracking-widest text-muted uppercase">
              Tese ativa
            </span>
            <button
              type="button"
              onClick={() => setActiveTeseId(null)}
              className={`rounded-[var(--radius-ui)] border px-3 py-1.5 text-xs transition-colors ${
                activeTeseId === null
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted hover:text-foreground"
              }`}
            >
              Todas
            </button>
            {loading ? (
              <span className="text-xs text-muted">Carregando...</span>
            ) : (
              teses.map((tese) => (
                <button
                  key={tese.id}
                  type="button"
                  onClick={() => setActiveTeseId(tese.id)}
                  className={`rounded-[var(--radius-ui)] border px-3 py-1.5 text-xs transition-colors ${
                    activeTeseId === tese.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted hover:text-foreground"
                  }`}
                  style={
                    activeTeseId !== tese.id && tese.color
                      ? { borderColor: tese.color }
                      : undefined
                  }
                >
                  {tese.name}
                  {tese._count != null && (
                    <span className="ml-1 opacity-70">({tese._count.clients})</span>
                  )}
                </button>
              ))
            )}
            <Link href="/admin#teses" className="btn-ghost text-xs">
              Gerenciar teses
            </Link>
          </div>
          {showPdfButton && (
            <a href={pdfUrl()} className="btn-primary text-xs" target="_blank" rel="noreferrer">
              Relatório PDF
              {activeTese ? ` — ${activeTese.name}` : ""}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
