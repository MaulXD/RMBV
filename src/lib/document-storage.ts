import { mkdir, writeFile, unlink, readFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

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

export async function saveClientDocument(
  clientId: string,
  file: File
): Promise<{ storedName: string; absolutePath: string }> {
  validateUpload(file);

  const dir = path.join(STORAGE_ROOT, clientId);
  await mkdir(dir, { recursive: true });

  const safeOriginal = sanitizeOriginalName(file.name || "documento");
  const storedName = `${randomUUID()}_${safeOriginal}`;
  const absolutePath = path.join(dir, storedName);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(absolutePath, buffer);

  return { storedName, absolutePath };
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
  const absolutePath = resolveDocumentPath(clientId, storedName);
  return readFile(absolutePath);
}

export async function deleteClientDocumentFile(clientId: string, storedName: string) {
  const absolutePath = resolveDocumentPath(clientId, storedName);
  await unlink(absolutePath).catch(() => undefined);
}
