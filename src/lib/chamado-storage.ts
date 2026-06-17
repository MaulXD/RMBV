import { mkdir, writeFile, unlink, readFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { del, get, put } from "@vercel/blob";
import { canPersistDocuments, sanitizeOriginalName, usesBlobStorage, validateUpload } from "./document-storage";

const STORAGE_ROOT = path.join(process.cwd(), "storage", "chamados");

function blobPathname(chamadoId: string, storedName: string) {
  return `chamados/${chamadoId}/${storedName}`;
}

export async function saveChamadoAttachment(
  chamadoId: string,
  file: File
): Promise<{ storedName: string }> {
  if (!canPersistDocuments()) {
    throw new Error(
      "Upload indisponível: configure Vercel Blob (BLOB_READ_WRITE_TOKEN) no projeto."
    );
  }

  validateUpload(file);

  const safeOriginal = sanitizeOriginalName(file.name || "anexo");
  const storedName = `${randomUUID()}_${safeOriginal}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  if (usesBlobStorage()) {
    await put(blobPathname(chamadoId, storedName), buffer, {
      access: "private",
      contentType: file.type || "application/octet-stream",
      addRandomSuffix: false,
    });
    return { storedName };
  }

  const dir = path.join(STORAGE_ROOT, chamadoId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, storedName), buffer);
  return { storedName };
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
