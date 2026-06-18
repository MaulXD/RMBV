"use client";

import Link from "next/link";
import { useTeseFilter } from "./TeseFilterProvider";
import { Icon } from "./ui/Icon";

export function TeseFilterBar({
  showPdfButton = false,
  statusFilter = "",
  embedded = false,
  variant = "bar",
}: {
  showPdfButton?: boolean;
  statusFilter?: string;
  embedded?: boolean;
  variant?: "bar" | "sidebar";
}) {
  const { teses, activeTeseId, setActiveTeseId, loading, activeTese } = useTeseFilter();

  function pdfUrl() {
    const params = new URLSearchParams();
    if (activeTeseId) params.set("teseId", activeTeseId);
    if (statusFilter) params.set("status", statusFilter);
    const qs = params.toString();
    return `/api/reports/pdf${qs ? `?${qs}` : ""}`;
  }

  const controls = (
    <>
      <span
        className="h-2 w-2 shrink-0 rounded-full bg-primary shadow-[0_0_6px_var(--color-primary)]"
        title="Tese ativa"
      />

      <div className="relative min-w-[160px] max-w-[220px] flex-1 sm:flex-none">
        <select
          id={embedded ? "tese-ativa-select-header" : "tese-ativa-select"}
          className="industrial-input w-full appearance-none py-1.5 pr-9 text-xs sm:text-sm"
          value={activeTeseId ?? "all"}
          disabled={loading}
          onChange={(e) =>
            setActiveTeseId(e.target.value === "all" ? null : e.target.value)
          }
        >
          <option value="all">{loading ? "Carregando..." : "Todas as teses"}</option>
          {teses.map((tese) => (
            <option key={tese.id} value={tese.id}>
              {tese.name}
              {tese._count != null ? ` (${tese._count.clients})` : ""}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-muted">
          <Icon name="chevronDown" className="h-3.5 w-3.5" />
        </span>
      </div>

      <Link
        href="/equipe#teses"
        className={`btn-ghost shrink-0 gap-1 text-xs ${embedded ? "hidden px-2 py-1 lg:inline-flex" : "gap-1.5"}`}
        title="Gerenciar teses"
      >
        <Icon name="briefcase" className="h-3.5 w-3.5" />
        {!embedded && "Gerenciar teses"}
      </Link>

      {showPdfButton && (
        <a
          href={pdfUrl()}
          className={`btn-primary shrink-0 gap-1 text-xs ${embedded ? "hidden px-2 py-1 md:inline-flex" : "gap-1.5"}`}
          target="_blank"
          rel="noreferrer"
          title={activeTese ? `PDF — ${activeTese.name}` : "Relatório PDF"}
        >
          <Icon name="fileDown" className="h-3.5 w-3.5" />
          {!embedded && (
            <>
              Relatório PDF
              {activeTese ? ` — ${activeTese.name}` : ""}
            </>
          )}
        </a>
      )}
    </>
  );

  if (embedded) {
    return (
      <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 overflow-hidden sm:gap-2 md:max-w-lg">
        {controls}
      </div>
    );
  }

  if (variant === "sidebar") {
    return (
      <div className="border-b border-border px-3 pb-3 pt-2.5">
        <label
          htmlFor="tese-ativa-select"
          className="mb-1.5 block text-[10px] font-semibold tracking-widest text-muted uppercase"
        >
          Tese ativa
        </label>
        <div className="relative">
          <select
            id="tese-ativa-select"
            className="industrial-input w-full appearance-none py-1.5 pr-8 text-xs"
            value={activeTeseId ?? "all"}
            disabled={loading}
            onChange={(e) =>
              setActiveTeseId(e.target.value === "all" ? null : e.target.value)
            }
          >
            <option value="all">{loading ? "Carregando..." : "Todas as teses"}</option>
            {teses.map((tese) => (
              <option key={tese.id} value={tese.id}>
                {tese.name}
                {tese._count != null ? ` (${tese._count.clients})` : ""}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-muted">
            <Icon name="chevronDown" className="h-3.5 w-3.5" />
          </span>
        </div>
        {showPdfButton && (
          <div className="mt-1.5 flex gap-1.5">
            <Link
              href="/equipe#teses"
              className="btn-ghost flex-1 py-1 text-xs"
              title="Gerenciar teses"
            >
              <Icon name="briefcase" className="h-3.5 w-3.5" />
              Gerenciar
            </Link>
            <a
              href={pdfUrl()}
              className="btn-primary flex-1 py-1 text-xs"
              target="_blank"
              rel="noreferrer"
              title={activeTese ? `PDF — ${activeTese.name}` : "Relatório PDF"}
            >
              <Icon name="fileDown" className="h-3.5 w-3.5" />
              PDF
            </a>
          </div>
        )}
      </div>
    );
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
            {controls}
          </div>
        </div>
      </div>
    </div>
  );
}
