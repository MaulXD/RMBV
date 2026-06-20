import sharp from "sharp";
import path from "path";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/bmp", "image/tiff"]);

export function isConvertibleImage(mimeType: string): boolean {
  return IMAGE_TYPES.has(mimeType);
}

export function replaceExtensionWithWebp(filename: string): string {
  const ext = path.extname(filename);
  return ext ? filename.slice(0, -ext.length) + ".webp" : filename + ".webp";
}

export async function convertToWebP(
  buffer: Buffer,
  mimeType: string
): Promise<{ buffer: Buffer; mimeType: string }> {
  if (!isConvertibleImage(mimeType)) {
    return { buffer, mimeType };
  }
  const converted = await sharp(buffer)
    .webp({ quality: 85, effort: 4 })
    .toBuffer();
  return { buffer: converted, mimeType: "image/webp" };
}
