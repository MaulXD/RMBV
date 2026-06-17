import { PDFDocument } from "pdf-lib";

type CompressLevel = "light" | "strong";

async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist");
  if (typeof window !== "undefined" && !pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();
  }
  return pdfjs;
}

async function renderPageToJpeg(
  pdfData: Uint8Array,
  pageNumber: number,
  level: CompressLevel
): Promise<{ jpeg: Uint8Array; width: number; height: number }> {
  const pdfjs = await loadPdfJs();
  const doc = await pdfjs.getDocument({ data: pdfData }).promise;
  const page = await doc.getPage(pageNumber);
  const base = page.getViewport({ scale: 1 });
  const scale = level === "strong" ? 0.65 : 0.85;
  const quality = level === "strong" ? 0.55 : 0.75;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível");

  await page.render({ canvasContext: ctx, viewport, canvas }).promise;

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Falha ao comprimir página"))),
      "image/jpeg",
      quality
    );
  });

  return {
    jpeg: new Uint8Array(await blob.arrayBuffer()),
    width: base.width,
    height: base.height,
  };
}

export async function compressPdfBytes(bytes: Uint8Array, level: CompressLevel): Promise<Uint8Array> {
  const pdfjs = await loadPdfJs();
  const src = await pdfjs.getDocument({ data: bytes }).promise;
  const out = await PDFDocument.create();

  for (let i = 1; i <= src.numPages; i += 1) {
    const { jpeg, width, height } = await renderPageToJpeg(bytes, i, level);
    const img = await out.embedJpg(jpeg);
    const page = out.addPage([width, height]);
    page.drawImage(img, { x: 0, y: 0, width, height });
  }

  return out.save();
}

export async function ocrPdfBytes(
  bytes: Uint8Array,
  onProgress?: (current: number, total: number) => void
): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const pdfjs = await loadPdfJs();
  const doc = await pdfjs.getDocument({ data: bytes }).promise;
  const worker = await createWorker("por");
  const parts: string[] = [];

  try {
    for (let i = 1; i <= doc.numPages; i += 1) {
      onProgress?.(i, doc.numPages);
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      const { data } = await worker.recognize(canvas);
      parts.push(`--- Página ${i} ---\n${data.text.trim()}`);
    }
  } finally {
    await worker.terminate();
  }

  return parts.join("\n\n");
}

export async function ocrImageFiles(
  files: File[],
  onProgress?: (current: number, total: number) => void
): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("por");
  const parts: string[] = [];

  try {
    for (let i = 0; i < files.length; i += 1) {
      onProgress?.(i + 1, files.length);
      const { data } = await worker.recognize(files[i]!);
      parts.push(`--- ${files[i]!.name} ---\n${data.text.trim()}`);
    }
  } finally {
    await worker.terminate();
  }

  return parts.join("\n\n");
}
