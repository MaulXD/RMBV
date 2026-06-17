import type { PageRotation } from "./pdf-organizer";

let workerReady = false;

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

export async function renderPdfPageThumbnail(
  pdfBytes: ArrayBuffer,
  pageIndex: number,
  options?: { scale?: number; rotation?: PageRotation }
): Promise<string> {
  const pdfjs = await loadPdfJs();
  const data = new Uint8Array(pdfBytes);
  const doc = await pdfjs.getDocument({ data }).promise;
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
}

export function thumbnailCacheKey(
  sourceId: string,
  pageIndex: number,
  rotation: PageRotation,
  scale = 0.35
) {
  return `${sourceId}:${pageIndex}:${rotation}:${scale}`;
}
