"use client";

import { useCallback, useRef, useState } from "react";
import {
  buildMergedPdf,
  buildSinglePagePdf,
  downloadBytes,
  imagesToPdf,
  loadPdfSources,
  sanitizeFilename,
  uploadPdfToClient,
  type BatesPosition,
  type OrganizerPage,
  type PageRotation,
  type PdfExportOptions,
  type PdfSource,
} from "@/lib/pdf-organizer";
import { ocrImageFiles, ocrPdfBytes } from "@/lib/pdf-compress-ocr";
import { clearPdfDocumentCache } from "@/lib/pdf-js-client";
import { ClientSearchField, type ClientOption } from "./ClientSearchField";
import { clearThumbnailCache } from "./PdfPagePreviewCard";
import {
  ImagePreviewGrid,
  PdfPreviewWorkspace,
  previewOverlayForMode,
} from "./PdfPreviewWorkspace";
import { ToolPickerCard, ToolPickerStrip } from "./ToolPickerCard";
import { Icon, type IconName } from "./ui/Icon";

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
  | "save"
  | "stamp";

const PDF_MODES: {
  id: PdfMode;
  label: string;
  description: string;
  icon: IconName;
  accent: "primary" | "amber" | "emerald" | "sky" | "violet";
}[] = [
  { id: "merge", label: "Juntar PDF", description: "Unir vários arquivos em um só.", icon: "layers", accent: "primary" },
  { id: "split", label: "Dividir", description: "Separar páginas em arquivos.", icon: "scissors", accent: "sky" },
  { id: "organize", label: "Organizar PDF", description: "Reordenar, girar e excluir páginas.", icon: "grip", accent: "amber" },
  { id: "bates", label: "Bates", description: "Numeração PREFIXO-0001 com posição.", icon: "hash", accent: "violet" },
  { id: "watermark", label: "Marca d'água", description: "Texto diagonal ou reto no documento.", icon: "stamp", accent: "emerald" },
  { id: "redact", label: "Redação", description: "Tarja preta em área da página.", icon: "eyeOff", accent: "primary" },
  { id: "compress", label: "Comprimir", description: "Reduzir tamanho para envio.", icon: "minimize", accent: "sky" },
  { id: "ocr", label: "OCR", description: "Extrair texto de PDF ou imagem.", icon: "scanText", accent: "amber" },
  { id: "images", label: "Imagens → PDF", description: "Converter fotos JPG/PNG em PDF.", icon: "image", accent: "emerald" },
  { id: "save", label: "Salvar no cliente", description: "Enviar resultado para Documentos.", icon: "folderUp", accent: "violet" },
  { id: "stamp", label: "Carimbo", description: "Carimbo com texto e data no rodapé.", icon: "stamp", accent: "emerald" },
];

const BATES_POSITIONS: { value: BatesPosition; label: string }[] = [
  { value: "bottom-right", label: "Inferior direito" },
  { value: "bottom-center", label: "Inferior centro" },
  { value: "bottom-left", label: "Inferior esquerdo" },
  { value: "top-right", label: "Superior direito" },
  { value: "top-center", label: "Superior centro" },
  { value: "top-left", label: "Superior esquerdo" },
];

function nextRotation(current: PageRotation): PageRotation {
  return ((current + 90) % 360) as PageRotation;
}

function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) {
    return list;
  }
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function PdfOrganizerTool() {
  const [mode, setMode] = useState<PdfMode>("merge");
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const ocrImageRef = useRef<HTMLInputElement>(null);
  const [sources, setSources] = useState<PdfSource[]>([]);
  const [pages, setPages] = useState<OrganizerPage[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const [batesEnabled, setBatesEnabled] = useState(false);
  const [batesPrefix, setBatesPrefix] = useState("DOC");
  const [batesStart, setBatesStart] = useState(1);
  const [batesPosition, setBatesPosition] = useState<BatesPosition>("bottom-right");
  const [watermarkEnabled, setWatermarkEnabled] = useState(false);
  const [watermarkText, setWatermarkText] = useState("CONFIDENCIAL");
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.25);
  const [watermarkDiagonal, setWatermarkDiagonal] = useState(true);
  const [redactionBottomPct, setRedactionBottomPct] = useState(0);
  const [compress, setCompress] = useState<"none" | "light" | "strong">("none");
  const [stampEnabled, setStampEnabled] = useState(false);
  const [stampText, setStampText] = useState("CÓPIA AUTENTICADA");
  const [stampIncludeDate, setStampIncludeDate] = useState(true);

  const [saveClient, setSaveClient] = useState<ClientOption | null>(null);
  const [saveFilename, setSaveFilename] = useState("documento-organizado.pdf");

  const [ocrText, setOcrText] = useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = useState<string | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const hasPages = pages.length > 0;
  const needsPages = mode !== "images";

  const exportOpts: PdfExportOptions = {
    bates:
      batesEnabled || mode === "bates"
        ? { enabled: true, prefix: batesPrefix, startNumber: batesStart, position: batesPosition }
        : undefined,
    watermark:
      watermarkEnabled || mode === "watermark"
        ? {
            enabled: true,
            text: watermarkText,
            opacity: watermarkOpacity,
            diagonal: watermarkDiagonal,
          }
        : undefined,
    redactions:
      redactionBottomPct > 0 || mode === "redact"
        ? Object.fromEntries(
            pages.map((p) => [
              p.id,
              [{ xPct: 0, yPct: 0, wPct: 100, hPct: redactionBottomPct || 12 }],
            ])
          )
        : undefined,
    compress: mode === "compress" ? compress : compress !== "none" ? compress : undefined,
    stamp:
      stampEnabled || mode === "stamp"
        ? { enabled: true, text: stampText, includeDate: stampIncludeDate }
        : undefined,
  };

  const addFiles = useCallback(async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
    );
    if (files.length === 0) {
      setError("Selecione arquivos PDF válidos.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const loaded = await loadPdfSources(files);
      if (loaded.sources.length === 0) {
        setError("Nenhuma página encontrada nos PDFs.");
        return;
      }
      setSources((prev) => [...prev, ...loaded.sources]);
      setPages((prev) => [...prev, ...loaded.pages]);
    } catch {
      setError("Não foi possível ler um dos PDFs.");
    } finally {
      setLoading(false);
    }
  }, []);

  async function addImagesAsPdf(fileList: FileList | File[]) {
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) {
      setError("Selecione imagens (JPG ou PNG).");
      return;
    }
    setImageFiles(files);
    setError(null);
    setSuccess(null);
  }

  async function convertImagePreviewToPdf() {
    if (imageFiles.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const bytes = await imagesToPdf(imageFiles);
      downloadBytes(bytes, `imagens-${Date.now()}.pdf`);
      const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
      const pdfFile = new File([blob], `imagens-${Date.now()}.pdf`, { type: "application/pdf" });
      await addFiles([pdfFile]);
      setImageFiles([]);
      setMode("merge");
      setSuccess("PDF gerado a partir das imagens. Você pode juntar ou exportar.");
    } catch {
      setError("Falha ao converter imagens em PDF.");
    } finally {
      setLoading(false);
    }
  }

  function removePage(id: string) {
    setPages((prev) => prev.filter((p) => p.id !== id));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function removeSelectedPages() {
    if (selected.size === 0) return;
    setPages((prev) => prev.filter((p) => !selected.has(p.id)));
    setSelected(new Set());
  }

  function rotatePage(id: string) {
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, rotation: nextRotation(p.rotation) } : p))
    );
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearAll() {
    setSources([]);
    setPages([]);
    setSelected(new Set());
    setImageFiles([]);
    setError(null);
    setSuccess(null);
    setOcrText(null);
    clearPdfDocumentCache();
    clearThumbnailCache();
    if (inputRef.current) inputRef.current.value = "";
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  async function buildBytes(pageList = pages) {
    return buildMergedPdf(pageList, sources, exportOpts);
  }

  function pagesForExport() {
    if (mode === "merge" && selected.size > 0) {
      return pages.filter((p) => selected.has(p.id));
    }
    return pages;
  }

  function selectAllPages() {
    setSelected(new Set(pages.map((p) => p.id)));
  }

  function reorderPages(from: number, to: number) {
    setPages((prev) => moveItem(prev, from, to));
    setDragIndex(null);
  }

  async function downloadMerged() {
    if (!hasPages) return;
    setExporting(true);
    setError(null);
    setSuccess(null);
    try {
      const bytes = await buildBytes(pagesForExport());
      downloadBytes(bytes, sanitizeFilename(saveFilename) || `pdf-organizado-${Date.now()}.pdf`);
    } catch {
      setError("Falha ao gerar o PDF.");
    } finally {
      setExporting(false);
    }
  }

  async function saveToClient() {
    if (!hasPages || !saveClient) {
      setError("Selecione um cliente.");
      return;
    }
    setExporting(true);
    setError(null);
    setSuccess(null);
    try {
      const bytes = await buildBytes(pagesForExport());
      const name = sanitizeFilename(saveFilename) || `pdf-organizado-${Date.now()}.pdf`;
      const result = await uploadPdfToClient(saveClient.id, bytes, name);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(`Salvo nos documentos de ${saveClient.name}.`);
    } catch {
      setError("Falha ao salvar no cliente.");
    } finally {
      setExporting(false);
    }
  }

  async function runOcr() {
    if (!hasPages) return;
    setExporting(true);
    setError(null);
    setOcrText(null);
    setOcrProgress("Preparando OCR…");
    try {
      const bytes = await buildBytes(pagesForExport());
      const text = await ocrPdfBytes(bytes, (cur, total) => {
        setOcrProgress(`Página ${cur}/${total}…`);
      });
      setOcrText(text || "(Nenhum texto detectado)");
    } catch {
      setError("Falha no OCR.");
    } finally {
      setOcrProgress(null);
      setExporting(false);
    }
  }

  async function runOcrOnImages(fileList: FileList | File[]) {
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return;
    setExporting(true);
    setError(null);
    setOcrProgress("OCR nas imagens…");
    try {
      const text = await ocrImageFiles(files, (cur, total) => {
        setOcrProgress(`Imagem ${cur}/${total}…`);
      });
      setOcrText(text || "(Nenhum texto detectado)");
    } catch {
      setError("Falha no OCR das imagens.");
    } finally {
      setOcrProgress(null);
      setExporting(false);
    }
  }

  async function downloadSelectedSeparate() {
    const chosen = pages.filter((p) => selected.has(p.id));
    if (chosen.length === 0) {
      setError("Selecione ao menos uma página.");
      return;
    }
    setExporting(true);
    setError(null);
    try {
      let batesNum = exportOpts.bates?.enabled ? batesStart : undefined;
      for (let i = 0; i < chosen.length; i += 1) {
        const page = chosen[i]!;
        const bytes = await buildSinglePagePdf(page, sources, exportOpts, batesNum);
        if (exportOpts.bates?.enabled && batesNum != null) batesNum += 1;
        const base = sanitizeFilename(page.sourceName.replace(/\.pdf$/i, ""));
        downloadBytes(bytes, `${base}-pagina-${page.pageIndex + 1}.pdf`);
        await new Promise((r) => setTimeout(r, 120));
      }
    } catch {
      setError("Falha ao dividir.");
    } finally {
      setExporting(false);
    }
  }

  async function downloadAllSeparate() {
    if (!hasPages) return;
    setExporting(true);
    setError(null);
    try {
      let batesNum = exportOpts.bates?.enabled ? batesStart : undefined;
      for (let i = 0; i < pages.length; i += 1) {
        const page = pages[i]!;
        const bytes = await buildSinglePagePdf(page, sources, exportOpts, batesNum);
        if (exportOpts.bates?.enabled && batesNum != null) batesNum += 1;
        const base = sanitizeFilename(page.sourceName.replace(/\.pdf$/i, ""));
        downloadBytes(bytes, `${base}-pagina-${page.pageIndex + 1}.pdf`);
        await new Promise((r) => setTimeout(r, 120));
      }
    } catch {
      setError("Falha ao dividir.");
    } finally {
      setExporting(false);
    }
  }

  function selectMode(next: PdfMode) {
    setMode(next);
    setError(null);
    if (next === "bates") setBatesEnabled(true);
    if (next === "watermark") setWatermarkEnabled(true);
    if (next === "redact" && redactionBottomPct === 0) setRedactionBottomPct(12);
    if (next === "compress" && compress === "none") setCompress("light");
  }

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-3 text-xs font-semibold tracking-widest text-muted uppercase">
          O que fazer com o PDF?
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {PDF_MODES.map((item) => (
            <ToolPickerCard
              key={item.id}
              icon={item.icon}
              title={item.label}
              description={item.description}
              accent={item.accent}
              active={mode === item.id}
              onClick={() => selectMode(item.id)}
            />
          ))}
        </div>
        <div className="mt-3 md:hidden">
          <ToolPickerStrip
            items={PDF_MODES.map((m) => ({ id: m.id, label: m.label, icon: m.icon }))}
            activeId={mode}
            onSelect={(id) => selectMode(id as PdfMode)}
          />
        </div>
      </section>

      {mode === "images" ? (
        <section className="soft-card space-y-4 p-5">
          <p className="text-sm text-muted">
            Selecione fotos ou prints — você verá a pré-visualização antes de gerar o PDF.
          </p>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/jpg"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) void addImagesAsPdf(e.target.files);
            }}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary"
              disabled={loading}
              onClick={() => imageInputRef.current?.click()}
            >
              <Icon name="image" className="h-4 w-4" />
              Escolher imagens
            </button>
            {imageFiles.length > 0 && (
              <button
                type="button"
                className="btn-primary"
                disabled={loading}
                onClick={() => void convertImagePreviewToPdf()}
              >
                <Icon name="layers" className="h-4 w-4" />
                {loading ? "Gerando PDF…" : `Gerar PDF (${imageFiles.length} img.)`}
              </button>
            )}
          </div>
          {imageFiles.length > 0 && (
            <ImagePreviewGrid
              files={imageFiles}
              onRemove={(i) => setImageFiles((prev) => prev.filter((_, idx) => idx !== i))}
            />
          )}
        </section>
      ) : (
        <section className="soft-card flex flex-wrap items-center gap-2 p-4">
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) void addFiles(e.target.files);
            }}
          />
          <button
            type="button"
            className="btn-primary"
            disabled={loading}
            onClick={() => inputRef.current?.click()}
          >
            <Icon name="upload" className="h-4 w-4" />
            {loading ? "Carregando…" : "Adicionar PDFs"}
          </button>
          {hasPages && (
            <button type="button" className="btn-ghost" onClick={clearAll}>
              Limpar
            </button>
          )}
          {hasPages && (
            <span className="text-xs text-muted">
              {sources.length} arquivo(s) · {pages.length} página(s)
            </span>
          )}
        </section>
      )}

      {mode === "bates" && (
        <section className="panel-solid grid gap-3 p-5 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={batesEnabled} onChange={(e) => setBatesEnabled(e.target.checked)} />
            Ativar numeração Bates
          </label>
          <input className="industrial-input text-sm" placeholder="Prefixo" value={batesPrefix} onChange={(e) => setBatesPrefix(e.target.value)} />
          <input className="industrial-input text-sm" type="number" min={1} value={batesStart} onChange={(e) => setBatesStart(Number(e.target.value) || 1)} />
          <select className="industrial-input text-sm sm:col-span-2" value={batesPosition} onChange={(e) => setBatesPosition(e.target.value as BatesPosition)}>
            {BATES_POSITIONS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </section>
      )}

      {mode === "watermark" && (
        <section className="panel-solid space-y-3 p-5">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={watermarkEnabled} onChange={(e) => setWatermarkEnabled(e.target.checked)} />
            Ativar marca d&apos;água
          </label>
          <input className="industrial-input text-sm" value={watermarkText} onChange={(e) => setWatermarkText(e.target.value)} />
          <input type="range" min={0.1} max={0.6} step={0.05} value={watermarkOpacity} onChange={(e) => setWatermarkOpacity(Number(e.target.value))} className="w-full" />
          <label className="flex items-center gap-2 text-xs text-muted">
            <input type="checkbox" checked={watermarkDiagonal} onChange={(e) => setWatermarkDiagonal(e.target.checked)} />
            Texto diagonal
          </label>
        </section>
      )}

      {mode === "stamp" && (
        <section className="panel-solid space-y-3 p-5">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={stampEnabled} onChange={(e) => setStampEnabled(e.target.checked)} />
            Ativar carimbo
          </label>
          <input className="industrial-input text-sm" value={stampText} onChange={(e) => setStampText(e.target.value)} />
          <label className="flex items-center gap-2 text-xs text-muted">
            <input type="checkbox" checked={stampIncludeDate} onChange={(e) => setStampIncludeDate(e.target.checked)} />
            Incluir data
          </label>
        </section>
      )}

      {mode === "redact" && (
        <section className="panel-solid space-y-2 p-5">
          <p className="text-sm text-muted">Tarja inferior (% da página)</p>
          <input type="range" min={0} max={40} value={redactionBottomPct} onChange={(e) => setRedactionBottomPct(Number(e.target.value))} className="w-full" />
          <p className="text-xs text-muted">{redactionBottomPct}% coberto em preto</p>
        </section>
      )}

      {mode === "compress" && (
        <section className="panel-solid p-5">
          <label className="mb-1 block text-xs text-muted">Nível de compressão</label>
          <select className="industrial-input text-sm" value={compress} onChange={(e) => setCompress(e.target.value as "none" | "light" | "strong")}>
            <option value="none">Nenhuma</option>
            <option value="light">Leve (recomendado)</option>
            <option value="strong">Forte</option>
          </select>
        </section>
      )}

      {mode === "ocr" && (
        <section className="panel-solid flex flex-wrap gap-2 p-5">
          <button type="button" className="btn-primary" disabled={exporting || !hasPages} onClick={() => void runOcr()}>
            <Icon name="scanText" className="h-4 w-4" />
            OCR do PDF carregado
          </button>
          <label className="btn-ghost cursor-pointer">
            <Icon name="image" className="h-4 w-4" />
            OCR em imagens
            <input ref={ocrImageRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { if (e.target.files?.length) void runOcrOnImages(e.target.files); }} />
          </label>
        </section>
      )}

      {mode === "save" && (
        <section className="panel-solid grid gap-4 p-5 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-muted">Nome do arquivo</label>
            <input className="industrial-input text-sm" value={saveFilename} onChange={(e) => setSaveFilename(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Cliente</label>
            <ClientSearchField value={saveClient} onChange={setSaveClient} />
          </div>
          <button type="button" className="btn-primary md:col-span-2" disabled={exporting || !saveClient || !hasPages} onClick={() => void saveToClient()}>
            <Icon name="folderUp" className="h-4 w-4" />
            Salvar nos Documentos do cliente
          </button>
        </section>
      )}

      {hasPages && (
        <PdfPreviewWorkspace
          mode={mode}
          pages={pages}
          sources={sources}
          selected={selected}
          dragIndex={dragIndex}
          overlayForIndex={(index) =>
            previewOverlayForMode(mode, index, {
              batesEnabled,
              batesPrefix,
              batesStart,
              batesPosition,
              watermarkEnabled,
              watermarkText,
              watermarkOpacity,
              watermarkDiagonal,
              redactionBottomPct,
              compress,
            })
          }
          onToggleSelect={toggleSelect}
          onRotate={rotatePage}
          onRemove={removePage}
          onDragStart={setDragIndex}
          onDragEnd={() => setDragIndex(null)}
          onDropOn={(to) => {
            if (dragIndex != null) reorderPages(dragIndex, to);
          }}
          onMovePage={reorderPages}
          onSelectAll={selectAllPages}
          onClearSelection={() => setSelected(new Set())}
          onRemoveSelected={removeSelectedPages}
        />
      )}

      {hasPages && mode === "organize" && (
        <section className="soft-card flex flex-wrap gap-2 p-5">
          <button type="button" className="btn-primary" disabled={exporting} onClick={() => void downloadMerged()}>
            <Icon name="fileDown" className="h-4 w-4" />
            {exporting ? "Gerando…" : `Baixar PDF organizado (${pages.length} pág.)`}
          </button>
          {selected.size > 0 && (
            <button
              type="button"
              className="btn-ghost text-red-600"
              onClick={removeSelectedPages}
            >
              <Icon name="trash" className="h-4 w-4" />
              Excluir {selected.size} selecionada(s)
            </button>
          )}
        </section>
      )}

      {hasPages && mode === "merge" && (
        <section className="soft-card p-5">
          <button type="button" className="btn-primary" disabled={exporting} onClick={() => void downloadMerged()}>
            <Icon name="layers" className="h-4 w-4" />
            {exporting
              ? "Gerando…"
              : selected.size > 0
                ? `Baixar PDF (${selected.size} páginas)`
                : "Baixar PDF único (juntado)"}
          </button>
        </section>
      )}

      {hasPages && mode === "split" && (
        <section className="soft-card flex flex-wrap gap-2 p-5">
          <button type="button" className="btn-primary" disabled={exporting || selected.size === 0} onClick={() => void downloadSelectedSeparate()}>
            <Icon name="scissors" className="h-4 w-4" />
            Dividir selecionadas ({selected.size})
          </button>
          <button type="button" className="btn-ghost" disabled={exporting} onClick={() => void downloadAllSeparate()}>
            Dividir todas ({pages.length})
          </button>
        </section>
      )}

      {hasPages && ["bates", "watermark", "redact", "compress", "save", "stamp"].includes(mode) && (
        <section className="soft-card p-5">
          <button type="button" className="btn-primary" disabled={exporting} onClick={() => void downloadMerged()}>
            <Icon name="fileDown" className="h-4 w-4" />
            {exporting ? "Gerando…" : mode === "save" ? "Gerar para salvar" : "Baixar PDF com alterações"}
          </button>
        </section>
      )}

      {needsPages && !hasPages && mode !== "ocr" && (
        <p className="text-center text-sm text-muted">Adicione PDFs para usar esta função.</p>
      )}

      {ocrProgress && <p className="text-sm text-muted">{ocrProgress}</p>}
      {ocrText && (
        <section className="panel-solid p-5">
          <h3 className="mb-2 text-sm font-semibold">Texto extraído</h3>
          <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap text-xs">{ocrText}</pre>
          <button type="button" className="btn-ghost mt-2 text-sm" onClick={() => void navigator.clipboard.writeText(ocrText)}>Copiar</button>
        </section>
      )}

      {success && <p className="alert alert-success">{success}</p>}
      {error && <p className="alert alert-error">{error}</p>}
    </div>
  );
}
