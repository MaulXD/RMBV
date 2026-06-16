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
    <div className="industrial-panel flex flex-col gap-4 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <p className="text-sm text-muted">
        Mostrando <span className="font-medium text-foreground">{from}</span>–
        <span className="font-medium text-foreground">{to}</span> de{" "}
        <span className="font-medium text-foreground">{total}</span> cliente(s)
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <label className="flex items-center gap-2 text-sm text-muted">
          Por página
          <select
            className="industrial-input w-auto min-w-[88px]"
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

        <nav className="flex flex-wrap items-center gap-1" aria-label="Paginação de clientes">
          <button
            type="button"
            className="btn-ghost px-2 py-1 text-xs"
            disabled={disabled || page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Anterior
          </button>

          {pages.map((item, index) =>
            item === "…" ? (
              <span key={`gap-${index}`} className="px-2 text-xs text-muted">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                className={`min-w-9 rounded-[var(--radius-ui)] px-2 py-1 text-xs font-medium transition-colors ${
                  item === page
                    ? "bg-primary text-primary-foreground"
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
            className="btn-ghost px-2 py-1 text-xs"
            disabled={disabled || page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Próxima
          </button>
        </nav>
      </div>
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
