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
import { ClientSearchField, type ClientOption } from "./ClientSearchField";
import { Icon } from "./ui/Icon";

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
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
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

  const [saveClient, setSaveClient] = useState<ClientOption | null>(null);
  const [saveFilename, setSaveFilename] = useState("documento-organizado.pdf");

  const [ocrText, setOcrText] = useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = useState<string | null>(null);

  const hasPages = pages.length > 0;

  const exportOpts: PdfExportOptions = {
    bates: batesEnabled
      ? { enabled: true, prefix: batesPrefix, startNumber: batesStart, position: batesPosition }
      : undefined,
    watermark: watermarkEnabled
      ? {
          enabled: true,
          text: watermarkText,
          opacity: watermarkOpacity,
          diagonal: watermarkDiagonal,
        }
      : undefined,
    redactions:
      redactionBottomPct > 0
        ? Object.fromEntries(
            pages.map((p) => [
              p.id,
              [{ xPct: 0, yPct: 0, wPct: 100, hPct: redactionBottomPct }],
            ])
          )
        : undefined,
    compress,
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
      setError("Não foi possível ler um dos PDFs. Verifique se o arquivo não está corrompido.");
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
    setLoading(true);
    setError(null);
    try {
      const bytes = await imagesToPdf(files);
      const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
      const pdfFile = new File([blob], `imagens-${Date.now()}.pdf`, { type: "application/pdf" });
      await addFiles([pdfFile]);
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
    setError(null);
    setSuccess(null);
    setOcrText(null);
    if (inputRef.current) inputRef.current.value = "";
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  async function buildBytes(pageList = pages) {
    return buildMergedPdf(pageList, sources, exportOpts);
  }

  async function downloadMerged() {
    if (!hasPages) return;
    setExporting(true);
    setError(null);
    setSuccess(null);
    try {
      const bytes = await buildBytes();
      downloadBytes(bytes, sanitizeFilename(saveFilename) || `pdf-organizado-${Date.now()}.pdf`);
    } catch {
      setError("Falha ao gerar o PDF. Tente com arquivos menores.");
    } finally {
      setExporting(false);
    }
  }

  async function saveToClient() {
    if (!hasPages || !saveClient) {
      setError("Selecione um cliente para salvar.");
      return;
    }
    setExporting(true);
    setError(null);
    setSuccess(null);
    try {
      const bytes = await buildBytes();
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
      const bytes = await buildBytes();
      const text = await ocrPdfBytes(bytes, (cur, total) => {
        setOcrProgress(`OCR página ${cur}/${total}…`);
      });
      setOcrText(text || "(Nenhum texto detectado)");
    } catch {
      setError("Falha no OCR. Tente com menos páginas.");
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
      setError("Selecione ao menos uma página para dividir.");
      return;
    }
    setExporting(true);
    setError(null);
    try {
      let batesNum = batesEnabled ? batesStart : undefined;
      for (let i = 0; i < chosen.length; i += 1) {
        const page = chosen[i]!;
        const bytes = await buildSinglePagePdf(page, sources, exportOpts, batesNum);
        if (batesEnabled && batesNum != null) batesNum += 1;
        const base = sanitizeFilename(page.sourceName.replace(/\.pdf$/i, ""));
        downloadBytes(bytes, `${base}-pagina-${page.pageIndex + 1}.pdf`);
        await new Promise((r) => setTimeout(r, 120));
      }
    } catch {
      setError("Falha ao dividir o PDF.");
    } finally {
      setExporting(false);
    }
  }

  async function downloadAllSeparate() {
    if (!hasPages) return;
    setExporting(true);
    setError(null);
    try {
      let batesNum = batesEnabled ? batesStart : undefined;
      for (let i = 0; i < pages.length; i += 1) {
        const page = pages[i]!;
        const bytes = await buildSinglePagePdf(page, sources, exportOpts, batesNum);
        if (batesEnabled && batesNum != null) batesNum += 1;
        const base = sanitizeFilename(page.sourceName.replace(/\.pdf$/i, ""));
        downloadBytes(bytes, `${base}-pagina-${page.pageIndex + 1}.pdf`);
        await new Promise((r) => setTimeout(r, 120));
      }
    } catch {
      setError("Falha ao dividir o PDF.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="panel-solid space-y-4 p-5">
        <div>
          <h2 className="font-semibold text-foreground">Organizador de PDF</h2>
          <p className="mt-1 text-sm text-muted">
            Junte, reordene, Bates, marca d&apos;água, redação, compressão e OCR — tudo no navegador.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
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
          <button
            type="button"
            className="btn-primary"
            disabled={loading}
            onClick={() => inputRef.current?.click()}
          >
            <Icon name="upload" className="h-4 w-4" />
            {loading ? "Carregando..." : "Adicionar PDFs"}
          </button>
          <button
            type="button"
            className="btn-ghost"
            disabled={loading}
            onClick={() => imageInputRef.current?.click()}
          >
            Imagens → PDF
          </button>
          <label className="btn-ghost cursor-pointer">
            OCR em imagens
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) void runOcrOnImages(e.target.files);
              }}
            />
          </label>
          {hasPages && (
            <button type="button" className="btn-ghost" onClick={clearAll}>
              Limpar tudo
            </button>
          )}
        </div>

        {hasPages && (
          <p className="text-xs text-muted">
            {sources.length} arquivo(s) · {pages.length} página(s)
          </p>
        )}
      </section>

      <section className="panel-solid grid gap-4 p-5 md:grid-cols-2">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Bates e marca d&apos;água</h3>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={batesEnabled} onChange={(e) => setBatesEnabled(e.target.checked)} />
            Numeração Bates (PREFIXO-0001)
          </label>
          {batesEnabled && (
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                className="industrial-input text-sm"
                placeholder="Prefixo"
                value={batesPrefix}
                onChange={(e) => setBatesPrefix(e.target.value)}
              />
              <input
                className="industrial-input text-sm"
                type="number"
                min={1}
                value={batesStart}
                onChange={(e) => setBatesStart(Number(e.target.value) || 1)}
              />
              <select
                className="industrial-input text-sm sm:col-span-2"
                value={batesPosition}
                onChange={(e) => setBatesPosition(e.target.value as BatesPosition)}
              >
                {BATES_POSITIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={watermarkEnabled}
              onChange={(e) => setWatermarkEnabled(e.target.checked)}
            />
            Marca d&apos;água
          </label>
          {watermarkEnabled && (
            <div className="space-y-2">
              <input
                className="industrial-input text-sm"
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
              />
              <input
                type="range"
                min={0.1}
                max={0.6}
                step={0.05}
                value={watermarkOpacity}
                onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
              />
              <label className="flex items-center gap-2 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={watermarkDiagonal}
                  onChange={(e) => setWatermarkDiagonal(e.target.checked)}
                />
                Diagonal
              </label>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Redação e compressão</h3>
          <label className="block text-xs text-muted">
            Tarja inferior (% da página) — redação em bloco preto
          </label>
          <input
            type="range"
            min={0}
            max={40}
            value={redactionBottomPct}
            onChange={(e) => setRedactionBottomPct(Number(e.target.value))}
            className="w-full"
          />
          <p className="text-xs text-muted">{redactionBottomPct}% inferior</p>
          <label className="mb-1 block text-xs text-muted">Compressão</label>
          <select
            className="industrial-input text-sm"
            value={compress}
            onChange={(e) => setCompress(e.target.value as "none" | "light" | "strong")}
          >
            <option value="none">Nenhuma</option>
            <option value="light">Leve (recomendado)</option>
            <option value="strong">Forte (arquivos menores)</option>
          </select>
        </div>
      </section>

      {hasPages && (
        <>
          <section className="panel-solid space-y-3 p-5">
            <h3 className="text-sm font-semibold">Páginas — arraste para reordenar</h3>
            <ul className="space-y-2">
              {pages.map((page, index) => (
                <li
                  key={page.id}
                  draggable
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIndex === null) return;
                    setPages((prev) => moveItem(prev, dragIndex, index));
                    setDragIndex(null);
                  }}
                  className={`flex flex-wrap items-center gap-2 rounded-[var(--radius-ui)] border px-3 py-2 ${
                    selected.has(page.id) ? "border-primary/50 bg-primary/5" : "border-border"
                  }`}
                >
                  <span className="cursor-grab text-muted" title="Arrastar">
                    ⋮⋮
                  </span>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selected.has(page.id)}
                      onChange={() => toggleSelect(page.id)}
                    />
                    <span>
                      <span className="font-medium">Pág. {page.pageIndex + 1}</span>
                      <span className="text-muted"> — {page.sourceName}</span>
                      {page.rotation > 0 && (
                        <span className="ml-1 text-xs text-primary">↻ {page.rotation}°</span>
                      )}
                    </span>
                  </label>
                  <div className="ml-auto flex gap-1">
                    <button
                      type="button"
                      className="btn-ghost px-2 py-1 text-xs"
                      disabled={index === 0}
                      onClick={() => setPages((prev) => moveItem(prev, index, index - 1))}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="btn-ghost px-2 py-1 text-xs"
                      disabled={index === pages.length - 1}
                      onClick={() => setPages((prev) => moveItem(prev, index, index + 1))}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="btn-ghost px-2 py-1 text-xs"
                      onClick={() => rotatePage(page.id)}
                    >
                      ↻
                    </button>
                    <button
                      type="button"
                      className="btn-ghost px-2 py-1 text-xs text-red-600"
                      onClick={() => removePage(page.id)}
                    >
                      <Icon name="x" className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel-solid space-y-4 p-5">
            <h3 className="text-sm font-semibold">Exportar e salvar no cliente</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-muted">Nome do arquivo</label>
                <input
                  className="industrial-input text-sm"
                  value={saveFilename}
                  onChange={(e) => setSaveFilename(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">Salvar em cliente (Documentos)</label>
                <ClientSearchField value={saveClient} onChange={setSaveClient} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary"
                disabled={exporting}
                onClick={() => void downloadMerged()}
              >
                <Icon name="fileDown" className="h-4 w-4" />
                {exporting ? "Gerando..." : "Baixar PDF único"}
              </button>
              <button
                type="button"
                className="btn-ghost"
                disabled={exporting || !saveClient}
                onClick={() => void saveToClient()}
              >
                Salvar no cliente
              </button>
              <button
                type="button"
                className="btn-ghost"
                disabled={exporting}
                onClick={() => void runOcr()}
              >
                OCR do PDF (Tesseract)
              </button>
              <button
                type="button"
                className="btn-ghost"
                disabled={exporting || selected.size === 0}
                onClick={() => void downloadSelectedSeparate()}
              >
                Dividir selecionadas ({selected.size})
              </button>
              <button
                type="button"
                className="btn-ghost"
                disabled={exporting}
                onClick={() => void downloadAllSeparate()}
              >
                Dividir todas
              </button>
            </div>
          </section>
        </>
      )}

      {ocrProgress && <p className="text-sm text-muted">{ocrProgress}</p>}
      {ocrText && (
        <section className="panel-solid p-5">
          <h3 className="mb-2 text-sm font-semibold">Texto extraído (OCR)</h3>
          <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap text-xs">{ocrText}</pre>
          <button
            type="button"
            className="btn-ghost mt-2 text-sm"
            onClick={() => void navigator.clipboard.writeText(ocrText)}
          >
            Copiar texto
          </button>
        </section>
      )}

      {success && <p className="alert alert-success">{success}</p>}
      {error && <p className="alert alert-error">{error}</p>}
    </div>
  );
}
