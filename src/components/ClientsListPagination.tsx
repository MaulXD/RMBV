"use client";

import {
  CLIENT_PAGE_SIZE_OPTIONS,
  type ClientPageSize,
} from "@/lib/client-pagination";

export function ClientsListPagination({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
  disabled,
}: {
  page: number;
  pageSize: ClientPageSize;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: ClientPageSize) => void;
  disabled?: boolean;
}) {
  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const pages = buildPageList(page, totalPages);

  return (
    <div className="mt-2 flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted">
        Mostrando{" "}
        <span className="font-medium text-foreground">
          {from}–{to}
        </span>{" "}
        de <span className="font-medium text-foreground">{total}</span> cliente(s)
      </p>

      <nav className="flex flex-wrap items-center justify-center gap-1" aria-label="Paginação de clientes">
        <button
          type="button"
          className="flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm text-muted transition-colors hover:bg-surface-elevated disabled:opacity-40"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Anterior
        </button>

        {pages.map((item, index) =>
          item === "…" ? (
            <span key={`gap-${index}`} className="px-1 text-sm text-muted">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-colors ${
                item === page
                  ? "bg-primary font-bold text-primary-foreground"
                  : "text-muted hover:bg-surface-elevated hover:text-foreground"
              }`}
              disabled={disabled}
              onClick={() => onPageChange(item)}
              aria-current={item === page ? "page" : undefined}
            >
              {item}
            </button>
          )
        )}

        <button
          type="button"
          className="flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm text-muted transition-colors hover:bg-surface-elevated disabled:opacity-40"
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Próxima
        </button>
      </nav>

      <label className="flex items-center justify-end gap-2 text-sm text-muted">
        Por página
        <select
          className="industrial-input w-auto min-w-[72px] py-1"
          value={pageSize}
          disabled={disabled}
          onChange={(e) => onPageSizeChange(Number(e.target.value) as ClientPageSize)}
        >
          {CLIENT_PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function buildPageList(current: number, totalPages: number): Array<number | "…"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: Array<number | "…"> = [1];

  if (current > 3) pages.push("…");

  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);

  for (let p = start; p <= end; p += 1) pages.push(p);

  if (current < totalPages - 2) pages.push("…");

  pages.push(totalPages);
  return pages;
}
