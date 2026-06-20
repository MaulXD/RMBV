import { mkdir, writeFile, unlink, readFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { del, get, put } from "@vercel/blob";
import { convertToWebP, isConvertibleImage, replaceExtensionWithWebp } from "./image-convert";

const STORAGE_ROOT = path.join(process.cwd(), "storage", "documents");
const MAX_BYTES = 15 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export function usesBlobStorage() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

/** Na Vercel o disco é efêmero; uploads exigem Vercel Blob. */
export function canPersistDocuments() {
  if (usesBlobStorage()) return true;
  return !process.env.VERCEL;
}

export function sanitizeOriginalName(name: string) {
  return name.replace(/[^\w.\-()áàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ ]/gi, "_").slice(0, 180);
}

export function validateUpload(file: File) {
  if (file.size > MAX_BYTES) {
    throw new Error("Arquivo excede o limite de 15 MB");
  }
  const mime = file.type || "application/octet-stream";
  if (!ALLOWED_MIME.has(mime)) {
    throw new Error("Tipo de arquivo não permitido. Use PDF, imagens, TXT, Word ou Excel.");
  }
}

function blobPathname(clientId: string, storedName: string) {
  return `documents/${clientId}/${storedName}`;
}

export async function saveClientDocument(
  clientId: string,
  file: File
): Promise<{ storedName: string; mimeType: string; size: number; absolutePath?: string }> {
  if (!canPersistDocuments()) {
    throw new Error(
      "Upload indisponível: configure Vercel Blob (BLOB_READ_WRITE_TOKEN) no projeto."
    );
  }

  validateUpload(file);

  const originalMime = file.type || "application/octet-stream";
  // Explicit type avoids Buffer<ArrayBuffer> vs Buffer<ArrayBufferLike> mismatch after reassignment
  let buffer: Buffer<ArrayBufferLike> = Buffer.from(new Uint8Array(await file.arrayBuffer()));
  let mimeType = originalMime;

  if (isConvertibleImage(originalMime)) {
    ({ buffer, mimeType } = await convertToWebP(buffer, originalMime));
  }

  const originalName = file.name || "documento";
  const safeName = isConvertibleImage(originalMime)
    ? sanitizeOriginalName(replaceExtensionWithWebp(originalName))
    : sanitizeOriginalName(originalName);
  const storedName = `${randomUUID()}_${safeName}`;

  if (usesBlobStorage()) {
    await put(blobPathname(clientId, storedName), buffer, {
      access: "private",
      contentType: mimeType,
      addRandomSuffix: false,
    });
    return { storedName, mimeType, size: buffer.length };
  }

  const dir = path.join(STORAGE_ROOT, clientId);
  await mkdir(dir, { recursive: true });
  const absolutePath = path.join(dir, storedName);
  await writeFile(absolutePath, buffer);

  return { storedName, mimeType, size: buffer.length, absolutePath };
}

export function resolveDocumentPath(clientId: string, storedName: string) {
  const resolved = path.resolve(STORAGE_ROOT, clientId, storedName);
  const clientDir = path.resolve(STORAGE_ROOT, clientId);
  if (!resolved.startsWith(clientDir + path.sep) && resolved !== clientDir) {
    throw new Error("Caminho inválido");
  }
  return resolved;
}

export async function readClientDocument(clientId: string, storedName: string) {
  if (usesBlobStorage()) {
    const pathname = blobPathname(clientId, storedName);
    const result = await get(pathname, { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) {
      throw new Error("Arquivo não encontrado");
    }
    return Buffer.from(await new Response(result.stream).arrayBuffer());
  }

  const absolutePath = resolveDocumentPath(clientId, storedName);
  return readFile(absolutePath);
}

export async function deleteClientDocumentFile(clientId: string, storedName: string) {
  if (usesBlobStorage()) {
    await del(blobPathname(clientId, storedName)).catch(() => undefined);
    return;
  }

  const absolutePath = resolveDocumentPath(clientId, storedName);
  await unlink(absolutePath).catch(() => undefined);
}
