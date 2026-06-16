"use client";

import Link from "next/link";
import { useTeseFilter } from "./TeseFilterProvider";
import { Icon } from "./ui/Icon";

export function TeseFilterBar({
  showPdfButton = false,
  statusFilter = "",
}: {
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
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <label
              htmlFor="tese-ativa-select"
              className="text-xs font-semibold tracking-widest text-muted uppercase"
            >
              Tese ativa
            </label>

            <div className="relative min-w-[220px] flex-1 sm:max-w-sm sm:flex-none">
              <select
                id="tese-ativa-select"
                className="industrial-input w-full appearance-none pr-10"
                value={activeTeseId ?? "all"}
                disabled={loading}
                onChange={(e) =>
                  setActiveTeseId(e.target.value === "all" ? null : e.target.value)
                }
              >
                <option value="all">
                  {loading ? "Carregando teses..." : "Todas as teses"}
                </option>
                {teses.map((tese) => (
                  <option key={tese.id} value={tese.id}>
                    {tese.name}
                    {tese._count != null ? ` (${tese._count.clients})` : ""}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted">
                <Icon name="chevronDown" className="h-4 w-4" />
              </span>
            </div>

            <Link href="/equipe#teses" className="btn-ghost gap-1.5 text-xs">
              <Icon name="briefcase" className="h-3.5 w-3.5" />
              Gerenciar teses
            </Link>
          </div>

          {showPdfButton && (
            <a
              href={pdfUrl()}
              className="btn-primary gap-1.5 text-xs"
              target="_blank"
              rel="noreferrer"
            >
              <Icon name="fileDown" className="h-3.5 w-3.5" />
              Relatório PDF
              {activeTese ? ` — ${activeTese.name}` : ""}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
