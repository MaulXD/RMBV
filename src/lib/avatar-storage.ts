import { put, del } from "@vercel/blob";
import { writeFile, unlink, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { convertToWebP } from "./image-convert";

const STORAGE_ROOT = path.join(process.cwd(), "storage", "avatars");
const MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
]);

function usesBlobStorage() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

export async function saveAvatar(
  userId: string,
  file: File
): Promise<string> {
  if (file.size > MAX_BYTES) {
    throw new Error("Imagem excede o limite de 5 MB");
  }
  const mime = file.type || "image/jpeg";
  if (!ALLOWED_MIME.has(mime)) {
    throw new Error("Use JPEG, PNG ou WebP.");
  }

  let buffer: Buffer<ArrayBufferLike> = Buffer.from(new Uint8Array(await file.arrayBuffer()));
  const { buffer: webpBuf } = await convertToWebP(buffer, mime);
  buffer = webpBuf;

  const storedName = `avatar_${userId}_${randomUUID()}.webp`;

  if (usesBlobStorage()) {
    const blob = await put(`avatars/${storedName}`, buffer, {
      access: "public",
      contentType: "image/webp",
      addRandomSuffix: false,
    });
    return blob.url;
  }

  await mkdir(STORAGE_ROOT, { recursive: true });
  await writeFile(path.join(STORAGE_ROOT, storedName), buffer);
  return `/api/users/me/avatar-file/${storedName}`;
}

export async function deleteAvatar(url: string) {
  try {
    if (usesBlobStorage() && url.startsWith("https://")) {
      await del(url);
    } else {
      const filename = path.basename(url);
      await unlink(path.join(STORAGE_ROOT, filename));
    }
  } catch {
    // ignore — file may already be gone
  }
}
