"use client";

import type { BatesPosition, OrganizerPage, PdfSource } from "@/lib/pdf-organizer";
import { formatBatesLabel } from "@/lib/pdf-organizer";
import { useEffect, useState } from "react";
import { Icon } from "./ui/Icon";
import { PdfPagePreviewCard } from "./PdfPagePreviewCard";

export type PdfPreviewOverlay = {
  batesLabel?: string;
  batesPosition?: BatesPosition;
  watermark?: { text: string; opacity: number; diagonal: boolean };
  redactionBottomPct?: number;
  badge?: { label: string; tone?: "primary" | "amber" | "sky" };
};

type PdfMode =
  | "merge"
  | "split"
  | "organize"
  | "bates"
  | "watermark"
  | "redact"
  | "compress"
  | "ocr"
  | "images"
  | "save";

const MODE_PREVIEW_HINT: Record<string, string> = {
  merge: "Pré-visualização do PDF final na ordem abaixo. Marque páginas se quiser juntar só algumas.",
  split: "Selecione as páginas para exportar em arquivos separados.",
  organize: "Arraste os cards para reordenar, gire ou remova páginas.",
  bates: "Veja onde a numeração Bates aparecerá em cada página.",
  watermark: "Prévia da marca d'água aplicada em todas as páginas.",
  redact: "A faixa preta mostra a área que será tarjada.",
  compress: "Miniaturas do documento antes da compressão.",
  ocr: "Páginas que serão enviadas ao OCR.",
  save: "Documento que será salvo nos Documentos do cliente.",
};

export function PdfPreviewWorkspace({
  mode,
  pages,
  sources,
  selected,
  overlayForIndex,
  dragIndex,
  onToggleSelect,
  onRotate,
  onRemove,
  onDragStart,
  onDropOn,
  onMovePage,
  onSelectAll,
  onClearSelection,
}: {
  mode: PdfMode;
  pages: OrganizerPage[];
  sources: PdfSource[];
  selected: Set<string>;
  overlayForIndex: (index: number, page: OrganizerPage) => PdfPreviewOverlay | undefined;
  dragIndex: number | null;
  onToggleSelect?: (id: string) => void;
  onRotate?: (id: string) => void;
  onRemove?: (id: string) => void;
  onDragStart?: (index: number) => void;
  onDropOn?: (index: number) => void;
  onMovePage?: (from: number, to: number) => void;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
}) {
  const selectable = mode === "split" || mode === "merge";
  const editable = mode === "organize";
  const hint = MODE_PREVIEW_HINT[mode] ?? "Pré-visualização das páginas.";

  return (
    <section className="soft-card overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-surface/40 px-4 py-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Icon name="eye" className="h-4 w-4 text-primary" />
            Pré-visualização
            <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-bold text-primary">
              {pages.length} pág.
            </span>
          </h3>
          <p className="mt-0.5 text-xs text-muted">{hint}</p>
        </div>
        {selectable && (
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={onSelectAll}>
              Selecionar todas
            </button>
            <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={onClearSelection}>
              Limpar seleção
            </button>
            {selected.size > 0 && (
              <span className="self-center text-xs text-primary">{selected.size} selecionada(s)</span>
            )}
          </div>
        )}
      </header>

      <div className="p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {pages.map((page, index) => {
            const overlay = overlayForIndex(index, page);
            return (
              <div key={page.id} className="relative">
                {overlay?.badge && (
                  <span
                    className={`absolute -right-1 -top-1 z-10 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase ${
                      overlay.badge.tone === "amber"
                        ? "bg-amber-500 text-white"
                        : overlay.badge.tone === "sky"
                          ? "bg-sky-500 text-white"
                          : "bg-primary text-white"
                    }`}
                  >
                    {overlay.badge.label}
                  </span>
                )}
                <PdfPagePreviewCard
                  page={page}
                  sources={sources}
                  index={index}
                  overlay={overlay}
                  selected={selected.has(page.id)}
                  selectable={selectable}
                  draggable={editable}
                  isDragging={dragIndex === index}
                  onSelect={selectable ? () => onToggleSelect?.(page.id) : undefined}
                  onRotate={editable ? () => onRotate?.(page.id) : undefined}
                  onRemove={editable ? () => onRemove?.(page.id) : undefined}
                  onMoveUp={
                    editable && index > 0 ? () => onMovePage?.(index, index - 1) : undefined
                  }
                  onMoveDown={
                    editable && index < pages.length - 1
                      ? () => onMovePage?.(index, index + 1)
                      : undefined
                  }
                  onDragStart={() => onDragStart?.(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDropOn?.(index)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function ImagePreviewGrid({
  files,
  onRemove,
}: {
  files: File[];
  onRemove?: (index: number) => void;
}) {
  return (
    <section className="soft-card overflow-hidden">
      <header className="border-b border-border/70 bg-surface/40 px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Icon name="image" className="h-4 w-4 text-primary" />
          Pré-visualização das imagens
          <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-bold text-primary">
            {files.length}
          </span>
        </h3>
      </header>
      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {files.map((file, index) => (
          <ImagePreviewItem key={`${file.name}-${index}`} file={file} index={index} onRemove={onRemove} />
        ))}
      </div>
    </section>
  );
}

function ImagePreviewItem({
  file,
  index,
  onRemove,
}: {
  file: File;
  index: number;
  onRemove?: (index: number) => void;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <article className="soft-card overflow-hidden">
      <div className="relative aspect-[3/4] bg-slate-200/80 dark:bg-slate-800/80">
        {src && <img src={src} alt={file.name} className="h-full w-full object-contain" />}
        <span className="absolute left-2 top-2 rounded-md bg-black/65 px-1.5 py-0.5 text-[10px] font-bold text-white">
          {index + 1}
        </span>
        {onRemove && (
          <button
            type="button"
            className="absolute right-2 top-2 rounded-md bg-black/55 p-1 text-white hover:bg-red-500"
            onClick={() => onRemove(index)}
          >
            <Icon name="x" className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <p className="truncate px-2 py-1.5 text-[9px] text-muted">{file.name}</p>
    </article>
  );
}

export function previewOverlayForMode(
  mode: PdfMode,
  index: number,
  opts: {
    batesEnabled: boolean;
    batesPrefix: string;
    batesStart: number;
    batesPosition: BatesPosition;
    watermarkEnabled: boolean;
    watermarkText: string;
    watermarkOpacity: number;
    watermarkDiagonal: boolean;
    redactionBottomPct: number;
    compress: string;
  }
): PdfPreviewOverlay | undefined {
  const overlay: PdfPreviewOverlay = {};

  if (opts.batesEnabled || mode === "bates") {
    overlay.batesLabel = formatBatesLabel(opts.batesPrefix, opts.batesStart + index);
    overlay.batesPosition = opts.batesPosition;
  }

  if (opts.watermarkEnabled || mode === "watermark") {
    overlay.watermark = {
      text: opts.watermarkText,
      opacity: opts.watermarkOpacity,
      diagonal: opts.watermarkDiagonal,
    };
  }

  if (opts.redactionBottomPct > 0 || mode === "redact") {
    overlay.redactionBottomPct = opts.redactionBottomPct || 12;
  }

  if (mode === "compress" && opts.compress !== "none") {
    overlay.badge = {
      label: opts.compress === "strong" ? "Forte" : "Leve",
      tone: "sky",
    };
  }

  if (mode === "ocr") {
    overlay.badge = { label: "OCR", tone: "amber" };
  }

  return Object.keys(overlay).length > 0 ? overlay : undefined;
}
