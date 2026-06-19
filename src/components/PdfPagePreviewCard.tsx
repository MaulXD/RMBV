"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { BatesPosition, OrganizerPage, PdfSource } from "@/lib/pdf-organizer";
import { renderPdfPageThumbnail, thumbnailCacheKey } from "@/lib/pdf-js-client";
import { Icon } from "./ui/Icon";

const thumbnailCache = new Map<string, string>();

export function clearThumbnailCache() {
  thumbnailCache.clear();
}

type PreviewOverlay = {
  batesLabel?: string;
  batesPosition?: BatesPosition;
  watermark?: { text: string; opacity: number; diagonal: boolean };
  redactionBottomPct?: number;
};

function batesPositionClass(position: BatesPosition): string {
  switch (position) {
    case "bottom-left":
      return "bottom-2 left-2";
    case "bottom-center":
      return "bottom-2 left-1/2 -translate-x-1/2";
    case "bottom-right":
      return "bottom-2 right-2";
    case "top-left":
      return "top-2 left-2";
    case "top-center":
      return "top-2 left-1/2 -translate-x-1/2";
    case "top-right":
      return "top-2 right-2";
  }
}

export function PdfPagePreviewCard({
  page,
  sources,
  index,
  overlay,
  selected,
  selectable,
  reorderable,
  showDelete,
  showIndex,
  isDragOver,
  isDragging,
  onSelect,
  onRotate,
  onRemove,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragEnd,
}: {
  page: OrganizerPage;
  sources: PdfSource[];
  index: number;
  overlay?: PreviewOverlay;
  selected?: boolean;
  selectable?: boolean;
  reorderable?: boolean;
  showDelete?: boolean;
  showIndex?: boolean;
  isDragOver?: boolean;
  isDragging?: boolean;
  onSelect?: () => void;
  onRotate?: () => void;
  onRemove?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDragStart?: (index: number) => void;
  onDragEnd?: () => void;
}) {
  const [thumb, setThumb] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const rootRef = useRef<HTMLElement>(null);

  const source = sources.find((s) => s.id === page.sourceId);

  useLayoutEffect(() => {
    if (!source) {
      setError(true);
      setLoading(false);
      return;
    }

    const key = thumbnailCacheKey(page.sourceId, page.pageIndex, page.rotation);
    const cached = thumbnailCache.get(key);
    if (cached) {
      setThumb(cached);
      setLoading(false);
      setError(false);
      return;
    }

    setThumb(null);
    setLoading(true);
    setError(false);

    let cancelled = false;
    const el = rootRef.current;
    if (!el) {
      setError(true);
      setLoading(false);
      return;
    }

    const loadThumb = () => {
      void renderPdfPageThumbnail(page.sourceId, source.bytes, page.pageIndex, {
        rotation: page.rotation,
      })
        .then((url) => {
          if (cancelled) return;
          thumbnailCache.set(key, url);
          setThumb(url);
          setLoading(false);
        })
        .catch(() => {
          if (!cancelled) {
            setError(true);
            setLoading(false);
          }
        });
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        loadThumb();
      },
      { rootMargin: "160px" }
    );

    observer.observe(el);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [page.sourceId, page.pageIndex, page.rotation, source]);

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
    onDragStart?.(index);
  }

  return (
    <article
      ref={rootRef}
      className={`group relative flex flex-col overflow-hidden rounded-xl border bg-surface-elevated shadow-sm transition-all duration-200 ${
        selected ? "border-primary ring-2 ring-primary/25" : "border-border/80 hover:border-primary/30"
      } ${isDragging ? "scale-[0.97] opacity-50" : ""} ${
        isDragOver ? "border-primary ring-2 ring-primary/40" : ""
      }`}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-200/80 dark:bg-slate-800/80">
        {loading && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div className="skeleton h-8 w-8 rounded-full" />
            <span className="text-[10px] text-muted">Carregando…</span>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted">
            <Icon name="fileText" className="h-8 w-8 opacity-40" />
            <span className="text-[10px]">Preview indisponível</span>
          </div>
        )}
        {thumb && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt={`Página ${page.pageIndex + 1}`}
            className="h-full w-full object-contain"
            draggable={false}
          />
        )}

        {overlay?.redactionBottomPct != null && overlay.redactionBottomPct > 0 && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 bg-black"
            style={{ height: `${overlay.redactionBottomPct}%` }}
          />
        )}

        {overlay?.watermark?.text && (
          <div
            className={`pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden ${
              overlay.watermark.diagonal ? "-rotate-45" : ""
            }`}
          >
            <span
              className="select-none text-center text-lg font-bold uppercase tracking-widest text-slate-500"
              style={{ opacity: overlay.watermark.opacity }}
            >
              {overlay.watermark.text}
            </span>
          </div>
        )}

        {overlay?.batesLabel && overlay.batesPosition && (
          <span
            className={`pointer-events-none absolute rounded bg-black/75 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white ${batesPositionClass(overlay.batesPosition)}`}
          >
            {overlay.batesLabel}
          </span>
        )}

        {showIndex !== false && (
          <span className="absolute left-2 top-2 rounded-md bg-black/65 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {index + 1}
          </span>
        )}

        {reorderable && (
          <div
            draggable
            onDragStart={handleDragStart}
            onDragEnd={onDragEnd}
            title="Arrastar para reordenar"
            className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 cursor-grab items-center gap-0.5 rounded-lg border border-white/30 bg-black/60 px-2 py-1 text-white backdrop-blur-sm active:cursor-grabbing"
          >
            <Icon name="grip" className="h-3.5 w-3.5" />
            <span className="text-[9px] font-semibold uppercase tracking-wide">Arrastar</span>
          </div>
        )}

        {selectable && (
          <label
            className={`absolute right-2 top-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border border-white/40 bg-black/50 backdrop-blur-sm ${
              showDelete ? "top-2" : ""
            }`}
          >
            <input type="checkbox" className="sr-only" checked={selected} onChange={onSelect} />
            {selected ? (
              <Icon name="check" className="h-3.5 w-3.5 text-white" />
            ) : (
              <span className="h-3 w-3 rounded-sm border border-white/80" />
            )}
          </label>
        )}

        {showDelete && onRemove && (
          <button
            type="button"
            className={`absolute right-2 rounded-md bg-black/55 p-1 text-white transition-colors hover:bg-red-500 ${
              selectable ? "top-10" : "top-2"
            }`}
            onClick={onRemove}
            title="Excluir página"
          >
            <Icon name="trash" className="h-3.5 w-3.5" />
          </button>
        )}

        <div className="absolute inset-x-0 bottom-0 flex translate-y-full flex-wrap justify-center gap-1 bg-gradient-to-t from-black/70 to-transparent p-2 pb-9 opacity-0 transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100">
          {onRotate && (
            <button
              type="button"
              className="rounded-lg bg-white/90 px-2 py-1 text-[10px] font-semibold text-slate-800 hover:bg-white"
              onClick={onRotate}
              title="Girar 90°"
            >
              <Icon name="rotateCw" className="h-3.5 w-3.5" />
            </button>
          )}
          {onMoveUp && (
            <button
              type="button"
              className="rounded-lg bg-white/90 px-2 py-1 text-[10px] font-semibold text-slate-800 hover:bg-white"
              onClick={onMoveUp}
            >
              ↑
            </button>
          )}
          {onMoveDown && (
            <button
              type="button"
              className="rounded-lg bg-white/90 px-2 py-1 text-[10px] font-semibold text-slate-800 hover:bg-white"
              onClick={onMoveDown}
            >
              ↓
            </button>
          )}
        </div>
      </div>

      <footer className="border-t border-border/60 px-2 py-1.5">
        <p className="truncate text-[10px] font-medium text-foreground">
          Pág. {page.pageIndex + 1}
          {page.rotation > 0 && <span className="ml-1 text-primary">· {page.rotation}°</span>}
        </p>
        <p className="truncate text-[9px] text-muted">{page.sourceName}</p>
      </footer>
    </article>
  );
}
