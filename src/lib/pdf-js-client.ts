import type { PageRotation } from "./pdf-organizer";

let workerReady = false;

type PdfDocumentProxy = Awaited<
  ReturnType<Awaited<ReturnType<typeof loadPdfJs>>["getDocument"]>["promise"]
>;

const documentCache = new Map<string, Promise<PdfDocumentProxy>>();

export async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist");
  if (typeof window !== "undefined" && !workerReady) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();
    workerReady = true;
  }
  return pdfjs;
}

export function clearPdfDocumentCache() {
  documentCache.clear();
}

/** Uma instância por arquivo — evita detach do ArrayBuffer compartilhado no worker. */
async function getPdfDocument(sourceId: string, pdfBytes: ArrayBuffer): Promise<PdfDocumentProxy> {
  let cached = documentCache.get(sourceId);
  if (!cached) {
    const pdfjs = await loadPdfJs();
    const data = new Uint8Array(pdfBytes.slice(0));
    cached = pdfjs.getDocument({ data }).promise;
    documentCache.set(sourceId, cached);
    void cached.catch(() => {
      documentCache.delete(sourceId);
    });
  }
  return cached;
}

const MAX_CONCURRENT_RENDERS = 3;
let activeRenders = 0;
const renderWaiters: Array<() => void> = [];

function acquireRenderSlot(): Promise<void> {
  if (activeRenders < MAX_CONCURRENT_RENDERS) {
    activeRenders += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    renderWaiters.push(() => {
      activeRenders += 1;
      resolve();
    });
  });
}

function releaseRenderSlot() {
  activeRenders -= 1;
  const next = renderWaiters.shift();
  if (next) next();
}

async function withRenderSlot<T>(fn: () => Promise<T>): Promise<T> {
  await acquireRenderSlot();
  try {
    return await fn();
  } finally {
    releaseRenderSlot();
  }
}

export async function renderPdfPageThumbnail(
  sourceId: string,
  pdfBytes: ArrayBuffer,
  pageIndex: number,
  options?: { scale?: number; rotation?: PageRotation }
): Promise<string> {
  return withRenderSlot(async () => {
    const doc = await getPdfDocument(sourceId, pdfBytes);
    const page = await doc.getPage(pageIndex + 1);
    const baseScale = options?.scale ?? 0.35;
    const rotation = options?.rotation ?? 0;
    const viewport = page.getViewport({ scale: baseScale, rotation });

    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponível");

    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    return canvas.toDataURL("image/jpeg", 0.82);
  });
}

export function thumbnailCacheKey(
  sourceId: string,
  pageIndex: number,
  rotation: PageRotation,
  scale = 0.35
) {
  return `${sourceId}:${pageIndex}:${rotation}:${scale}`;
}
