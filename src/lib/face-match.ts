/**
 * Limiares alinhados ao face-api (FaceMatcher default ≈ 0,6).
 * Distância euclidiana entre descritores 128D — quanto menor, mais parecido.
 */
export const FACE_MATCH_MAX_DISTANCE = 0.6;

/** Confiança mínima no ponto mobile (evita passar com ~2% no limiar). */
export const FACE_SELFIE_MIN_CONFIDENCE = 0.55;

/** Margem mínima entre 1º e 2º colocado no quiosque (evita troca entre pessoas). */
export const FACE_MATCH_MIN_GAP = 0.06;

export function euclideanDistance(
  a: Float32Array | number[],
  b: Float32Array | number[],
): number {
  let sum = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const d = (a[i] as number) - (b[i] as number);
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/** Confiança 0–1 para exibição (1 = match perfeito). */
export function matchConfidence(distance: number): number {
  return Math.max(0, Math.min(1, 1 - distance / FACE_MATCH_MAX_DISTANCE));
}

export function isFaceMatch(distance: number): boolean {
  return distance < FACE_MATCH_MAX_DISTANCE;
}

/** Match com confiança mínima para bater ponto no celular. */
export function isStrongSelfieMatch(distance: number): boolean {
  return isFaceMatch(distance) && matchConfidence(distance) >= FACE_SELFIE_MIN_CONFIDENCE;
}

export function toDescriptorArray(raw: unknown): Float32Array | null {
  if (!raw) return null;
  if (raw instanceof Float32Array) return raw;
  if (Array.isArray(raw) && raw.length === 128) {
    return new Float32Array(raw as number[]);
  }
  return null;
}

export function findBestFaceMatch<T extends { descriptor: Float32Array | number[] }>(
  probe: Float32Array,
  candidates: T[],
): { item: T; distance: number; confidence: number } | null {
  if (candidates.length === 0) return null;

  let best: T | null = null;
  let bestDist = Infinity;
  let secondDist = Infinity;

  for (const c of candidates) {
    const dist = euclideanDistance(probe, c.descriptor);
    if (dist < bestDist) {
      secondDist = bestDist;
      bestDist = dist;
      best = c;
    } else if (dist < secondDist) {
      secondDist = dist;
    }
  }

  if (!best || !isFaceMatch(bestDist)) return null;

  if (candidates.length > 1 && secondDist - bestDist < FACE_MATCH_MIN_GAP) {
    return null;
  }

  return {
    item: best,
    distance: bestDist,
    confidence: matchConfidence(bestDist),
  };
}
