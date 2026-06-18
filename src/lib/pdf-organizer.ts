import { degrees, PDFDocument, rgb, StandardFonts, type PDFPage, type Rotation } from "pdf-lib";

export type PageRotation = 0 | 90 | 180 | 270;

export type BatesPosition =
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"
  | "top-left"
  | "top-center"
  | "top-right";

export type RedactionRect = {
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
};

export type PdfExportOptions = {
  bates?: {
    enabled: boolean;
    prefix: string;
    startNumber: number;
    position: BatesPosition;
  };
  watermark?: {
    enabled: boolean;
    text: string;
    opacity: number;
    diagonal: boolean;
  };
  redactions?: Record<string, RedactionRect[]>;
  compress?: "none" | "light" | "strong";
  stamp?: {
    enabled: boolean;
    text: string;
    includeDate: boolean;
  };
};

export type PdfSource = {
  id: string;
  name: string;
  bytes: ArrayBuffer;
  pageCount: number;
};

export type OrganizerPage = {
  id: string;
  sourceId: string;
  sourceName: string;
  pageIndex: number;
  rotation: PageRotation;
};

export function rotationToDegrees(rotation: PageRotation): Rotation {
  return degrees(rotation);
}

export function formatBatesLabel(prefix: string, number: number) {
  const clean = prefix.trim() || "DOC";
  return `${clean}-${String(number).padStart(4, "0")}`;
}

function batesCoords(position: BatesPosition, width: number, height: number, textWidth: number) {
  const pad = 28;
  const fontSize = 9;
  switch (position) {
    case "bottom-left":
      return { x: pad, y: pad };
    case "bottom-center":
      return { x: Math.max(pad, width / 2 - textWidth / 2), y: pad };
    case "bottom-right":
      return { x: Math.max(pad, width - textWidth - pad), y: pad };
    case "top-left":
      return { x: pad, y: height - pad - fontSize };
    case "top-center":
      return { x: Math.max(pad, width / 2 - textWidth / 2), y: height - pad - fontSize };
    case "top-right":
      return { x: Math.max(pad, width - textWidth - pad), y: height - pad - fontSize };
  }
}

async function decoratePage(
  page: PDFPage,
  doc: PDFDocument,
  opts: {
    batesText?: string;
    batesPosition?: BatesPosition;
    watermark?: { text: string; opacity: number; diagonal: boolean };
    redactions?: RedactionRect[];
    stamp?: { text: string; includeDate: boolean };
  }
) {
  const { width, height } = page.getSize();

  for (const rect of opts.redactions ?? []) {
    const w = (rect.wPct / 100) * width;
    const h = (rect.hPct / 100) * height;
    const x = (rect.xPct / 100) * width;
    const y = (rect.yPct / 100) * height;
    page.drawRectangle({ x, y, width: w, height: h, color: rgb(0, 0, 0), borderWidth: 0 });
  }

  const font = await doc.embedFont(StandardFonts.Helvetica);

  if (opts.watermark?.text) {
    const size = Math.min(width, height) / 14;
    page.drawText(opts.watermark.text, {
      x: width * 0.2,
      y: height * 0.5,
      size,
      font,
      color: rgb(0.7, 0.7, 0.7),
      opacity: opts.watermark.opacity,
      rotate: opts.watermark.diagonal ? degrees(45) : degrees(0),
    });
  }

  if (opts.batesText && opts.batesPosition) {
    const fontSize = 9;
    const textWidth = font.widthOfTextAtSize(opts.batesText, fontSize);
    const { x, y } = batesCoords(opts.batesPosition, width, height, textWidth);
    page.drawText(opts.batesText, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });
  }

  if (opts.stamp?.text) {
    const stampLines = [opts.stamp.text];
    if (opts.stamp.includeDate) {
      stampLines.push(new Date().toLocaleDateString("pt-BR"));
    }
    const stampText = stampLines.join(" · ");
    const fontSize = 8;
    const textWidth = font.widthOfTextAtSize(stampText, fontSize);
    page.drawRectangle({
      x: width - textWidth - 16,
      y: 12,
      width: textWidth + 12,
      height: 22,
      color: rgb(1, 1, 1),
      opacity: 0.85,
      borderWidth: 1,
      borderColor: rgb(0.2, 0.2, 0.2),
    });
    page.drawText(stampText, {
      x: width - textWidth - 10,
      y: 18,
      size: fontSize,
      font,
      color: rgb(0.15, 0.15, 0.15),
    });
  }
}

export async function loadPdfSources(files: File[]): Promise<{
  sources: PdfSource[];
  pages: OrganizerPage[];
}> {
  const sources: PdfSource[] = [];
  const pages: OrganizerPage[] = [];

  for (const file of files) {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      continue;
    }
    const bytes = await file.arrayBuffer();
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const pageCount = doc.getPageCount();
    const id = crypto.randomUUID();
    sources.push({ id, name: file.name, bytes, pageCount });

    for (let i = 0; i < pageCount; i += 1) {
      pages.push({
        id: crypto.randomUUID(),
        sourceId: id,
        sourceName: file.name,
        pageIndex: i,
        rotation: 0,
      });
    }
  }

  return { sources, pages };
}

async function copyPageInto(
  target: PDFDocument,
  sources: Map<string, ArrayBuffer>,
  page: OrganizerPage,
  exportOpts?: PdfExportOptions,
  batesNumber?: number
) {
  const bytes = sources.get(page.sourceId);
  if (!bytes) throw new Error("Arquivo de origem não encontrado");

  const source = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const [copied] = await target.copyPages(source, [page.pageIndex]);
  if (page.rotation) {
    copied.setRotation(rotationToDegrees(page.rotation));
  }

  const bates =
    exportOpts?.bates?.enabled && batesNumber != null
      ? formatBatesLabel(exportOpts.bates.prefix, batesNumber)
      : undefined;

  await decoratePage(copied, target, {
    batesText: bates,
    batesPosition: exportOpts?.bates?.position,
    watermark:
      exportOpts?.watermark?.enabled && exportOpts.watermark.text
        ? {
            text: exportOpts.watermark.text,
            opacity: exportOpts.watermark.opacity,
            diagonal: exportOpts.watermark.diagonal,
          }
        : undefined,
    redactions: exportOpts?.redactions?.[page.id],
    stamp:
      exportOpts?.stamp?.enabled && exportOpts.stamp.text
        ? { text: exportOpts.stamp.text, includeDate: exportOpts.stamp.includeDate }
        : undefined,
  });

  target.addPage(copied);
}

export async function buildMergedPdf(
  pages: OrganizerPage[],
  sources: PdfSource[],
  exportOpts?: PdfExportOptions
): Promise<Uint8Array> {
  const map = new Map(sources.map((s) => [s.id, s.bytes]));
  const doc = await PDFDocument.create();
  let batesCounter = exportOpts?.bates?.startNumber ?? 1;

  for (const page of pages) {
    const batesNum = exportOpts?.bates?.enabled ? batesCounter++ : undefined;
    await copyPageInto(doc, map, page, exportOpts, batesNum);
  }

  let bytes = await doc.save();

  if (exportOpts?.compress && exportOpts.compress !== "none") {
    const { compressPdfBytes } = await import("./pdf-compress-ocr");
    bytes = await compressPdfBytes(bytes, exportOpts.compress);
  }

  return bytes;
}

export async function buildSinglePagePdf(
  page: OrganizerPage,
  sources: PdfSource[],
  exportOpts?: PdfExportOptions,
  batesNumber?: number
): Promise<Uint8Array> {
  const map = new Map(sources.map((s) => [s.id, s.bytes]));
  const doc = await PDFDocument.create();
  await copyPageInto(doc, map, page, exportOpts, batesNumber);
  let bytes = await doc.save();

  if (exportOpts?.compress && exportOpts.compress !== "none") {
    const { compressPdfBytes } = await import("./pdf-compress-ocr");
    bytes = await compressPdfBytes(bytes, exportOpts.compress);
  }

  return bytes;
}

export async function imagesToPdf(files: File[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();

  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const isPng = file.type === "image/png" || file.name.toLowerCase().endsWith(".png");
    const img = isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
    const page = doc.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  }

  return doc.save();
}

export function downloadBytes(bytes: Uint8Array, filename: string, mime = "application/pdf") {
  const blob = new Blob([new Uint8Array(bytes)], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function sanitizeFilename(name: string) {
  return name.replace(/[^\w.\-() ]+/g, "_").slice(0, 120);
}

export async function uploadPdfToClient(
  clientId: string,
  bytes: Uint8Array,
  filename: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
  const form = new FormData();
  form.append("file", blob, filename);
  const res = await fetch(`/api/clients/${clientId}/documents`, { method: "POST", body: form });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: data.error ?? "Falha ao salvar no cliente" };
  }
  return { ok: true };
}
