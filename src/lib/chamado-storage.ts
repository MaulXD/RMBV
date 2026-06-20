import { mkdir, writeFile, unlink, readFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { del, get, put } from "@vercel/blob";
import { canPersistDocuments, sanitizeOriginalName, usesBlobStorage, validateUpload } from "./document-storage";
import { convertToWebP, isConvertibleImage, replaceExtensionWithWebp } from "./image-convert";

const STORAGE_ROOT = path.join(process.cwd(), "storage", "chamados");

function blobPathname(chamadoId: string, storedName: string) {
  return `chamados/${chamadoId}/${storedName}`;
}

export async function saveChamadoAttachment(
  chamadoId: string,
  file: File
): Promise<{ storedName: string; mimeType: string; size: number }> {
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

  const originalName = file.name || "anexo";
  const safeName = isConvertibleImage(originalMime)
    ? sanitizeOriginalName(replaceExtensionWithWebp(originalName))
    : sanitizeOriginalName(originalName);
  const storedName = `${randomUUID()}_${safeName}`;

  if (usesBlobStorage()) {
    await put(blobPathname(chamadoId, storedName), buffer, {
      access: "private",
      contentType: mimeType,
      addRandomSuffix: false,
    });
    return { storedName, mimeType, size: buffer.length };
  }

  const dir = path.join(STORAGE_ROOT, chamadoId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, storedName), buffer);
  return { storedName, mimeType, size: buffer.length };
}

function resolvePath(chamadoId: string, storedName: string) {
  const resolved = path.resolve(STORAGE_ROOT, chamadoId, storedName);
  const base = path.resolve(STORAGE_ROOT, chamadoId);
  if (!resolved.startsWith(base + path.sep) && resolved !== base) {
    throw new Error("Caminho inválido");
  }
  return resolved;
}

export async function readChamadoAttachment(chamadoId: string, storedName: string) {
  if (usesBlobStorage()) {
    const result = await get(blobPathname(chamadoId, storedName), { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) {
      throw new Error("Arquivo não encontrado");
    }
    return Buffer.from(await new Response(result.stream).arrayBuffer());
  }
  return readFile(resolvePath(chamadoId, storedName));
}

export async function deleteChamadoAttachmentFile(chamadoId: string, storedName: string) {
  if (usesBlobStorage()) {
    await del(blobPathname(chamadoId, storedName)).catch(() => undefined);
    return;
  }
  await unlink(resolvePath(chamadoId, storedName)).catch(() => undefined);
}
