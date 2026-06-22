import {
  euclideanDistance,
  isStrongSelfieMatch,
  matchConfidence,
  toDescriptorArray,
  FACE_SELFIE_MIN_CONFIDENCE,
} from "@/lib/face-match";

const DESCRIPTOR_LENGTH = 128;

export function parseStoredFaceDescriptor(raw: unknown): number[] | null {
  const parsed = toDescriptorArray(raw);
  if (!parsed || parsed.length !== DESCRIPTOR_LENGTH) return null;
  return Array.from(parsed);
}

export function parseProbeDescriptor(raw: unknown): number[] | null {
  if (!Array.isArray(raw) || raw.length !== DESCRIPTOR_LENGTH) return null;
  if (!raw.every((n) => typeof n === "number" && Number.isFinite(n))) return null;
  return raw;
}

export type FaceVerifyResult =
  | { ok: true; confidence: number; distance: number }
  | { ok: false; reason: "invalid_probe" | "no_stored" | "mismatch"; distance?: number; confidence?: number };

/** Compara descritor capturado na hora com o template armazenado no cadastro. */
export function verifyFaceProbe(
  stored: unknown,
  probe: number[],
  minConfidence = FACE_SELFIE_MIN_CONFIDENCE,
): FaceVerifyResult {
  const storedArr = parseStoredFaceDescriptor(stored);
  if (!storedArr) {
    return { ok: false, reason: "no_stored" };
  }

  if (probe.length !== DESCRIPTOR_LENGTH) {
    return { ok: false, reason: "invalid_probe" };
  }

  const distance = euclideanDistance(probe, storedArr);
  const confidence = matchConfidence(distance);

  if (!isStrongSelfieMatch(distance, minConfidence)) {
    return { ok: false, reason: "mismatch", distance, confidence };
  }

  return { ok: true, confidence, distance };
}
