"use client";

import { useEffect, useState } from "react";
import { CLIENT_PAGE_SIZE_OPTIONS } from "@/lib/client-pagination";

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
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  disabled?: boolean;
}) {
  const [inputValue, setInputValue] = useState(String(pageSize));

  useEffect(() => {
    setInputValue(String(pageSize));
  }, [pageSize]);

  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const pages = buildPageList(page, totalPages);

  function applyCustomSize(raw: string) {
    const n = parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 1) {
      onPageSizeChange(n);
    } else {
      setInputValue(String(pageSize));
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted">
        Mostrando{" "}
        <span className="font-medium text-foreground">{from}–{to}</span>{" "}
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
            <span key={`gap-${index}`} className="px-1 text-sm text-muted">…</span>
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

      <div className="flex items-center justify-end gap-2 text-sm text-muted">
        <span>Por página</span>
        <input
          type="number"
          min={1}
          max={total}
          className="industrial-input w-[72px] py-1 text-center"
          value={inputValue}
          disabled={disabled}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={(e) => applyCustomSize(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") applyCustomSize((e.target as HTMLInputElement).value);
          }}
        />
        <span className="text-muted/50">ou</span>
        <button
          type="button"
          className="btn-ghost py-1 text-xs"
          disabled={disabled || pageSize >= total}
          onClick={() => onPageSizeChange(total)}
        >
          Ver todos
        </button>
        {!CLIENT_PAGE_SIZE_OPTIONS.includes(pageSize as typeof CLIENT_PAGE_SIZE_OPTIONS[number]) && pageSize < total && (
          <button
            type="button"
            className="btn-ghost py-1 text-xs"
            disabled={disabled}
            onClick={() => onPageSizeChange(30)}
          >
            Resetar
          </button>
        )}
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
