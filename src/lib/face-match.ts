/**
 * Limiares alinhados ao face-api (FaceMatcher default ≈ 0,6).
 * Distância euclidiana entre descritores 128D — quanto menor, mais parecido.
 */
export const FACE_MATCH_MAX_DISTANCE = 0.6;

/** Confiança mínima no ponto mobile (evita passar com ~2% no limiar). */
export const FACE_SELFIE_MIN_CONFIDENCE = 0.55;

/** Frames consecutivos com match forte antes de confirmar identidade. */
export const FACE_MATCH_STABLE_FRAMES = 5;

/** Falhas consecutivas (sem rosto ou distância ≥ limiar) antes de exibir erro. */
export const FACE_MATCH_FAIL_STREAK_MAX = 3;

/** Detector alinhado ao cadastro e prova de vida (416px). */
export const FACE_RECOGNITION_DETECT = {
  inputSize: 416,
  scoreThreshold: 0.5,
} as const;

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
export function isStrongSelfieMatch(
  distance: number,
  minConfidence = FACE_SELFIE_MIN_CONFIDENCE,
): boolean {
  return isFaceMatch(distance) && matchConfidence(distance) >= minConfidence;
}

export type MatchFrameTracker = {
  streak: number;
  confidenceSum: number;
  failStreak: number;
};

export type MatchFrameStatus = "no_face" | "reject" | "weak" | "building" | "ready";

export type MatchFrameTick = {
  status: MatchFrameStatus;
  confidence: number;
  progress: number;
  streak: number;
  /** Média de confiança dos frames válidos na sequência atual. */
  averageConfidence: number;
};

export function createMatchFrameTracker(): MatchFrameTracker {
  return { streak: 0, confidenceSum: 0, failStreak: 0 };
}

export function resetMatchFrameTracker(tracker = createMatchFrameTracker()): MatchFrameTracker {
  tracker.streak = 0;
  tracker.confidenceSum = 0;
  tracker.failStreak = 0;
  return tracker;
}

/**
 * Acumula frames consecutivos com match forte; reduz falsos positivos e oscilação de %.
 */
export function tickStrongMatchFrame(
  tracker: MatchFrameTracker,
  distance: number,
  minConfidence = FACE_SELFIE_MIN_CONFIDENCE,
): MatchFrameTick {
  const confidence = matchConfidence(distance);

  if (!isFaceMatch(distance)) {
    tracker.streak = 0;
    tracker.confidenceSum = 0;
    tracker.failStreak += 1;
    return {
      status: tracker.failStreak >= FACE_MATCH_FAIL_STREAK_MAX ? "reject" : "weak",
      confidence,
      progress: 0,
      streak: 0,
      averageConfidence: confidence,
    };
  }

  tracker.failStreak = 0;

  if (!isStrongSelfieMatch(distance, minConfidence)) {
    tracker.streak = 0;
    tracker.confidenceSum = 0;
    return {
      status: "weak",
      confidence,
      progress: 0,
      streak: 0,
      averageConfidence: confidence,
    };
  }

  tracker.streak += 1;
  tracker.confidenceSum += confidence;
  const averageConfidence = tracker.confidenceSum / tracker.streak;
  const progress = tracker.streak / FACE_MATCH_STABLE_FRAMES;

  if (tracker.streak >= FACE_MATCH_STABLE_FRAMES) {
    return {
      status: "ready",
      confidence,
      progress: 1,
      streak: tracker.streak,
      averageConfidence,
    };
  }

  return {
    status: "building",
    confidence,
    progress,
    streak: tracker.streak,
    averageConfidence,
  };
}

export function tickNoFaceMatchFrame(tracker: MatchFrameTracker): MatchFrameTick {
  tracker.streak = 0;
  tracker.confidenceSum = 0;
  tracker.failStreak += 1;
  return {
    status: tracker.failStreak >= FACE_MATCH_FAIL_STREAK_MAX ? "reject" : "no_face",
    confidence: 0,
    progress: 0,
    streak: 0,
    averageConfidence: 0,
  };
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

  if (!isStrongSelfieMatch(bestDist)) return null;

  if (candidates.length > 1 && secondDist - bestDist < FACE_MATCH_MIN_GAP) {
    return null;
  }

  return {
    item: best,
    distance: bestDist,
    confidence: matchConfidence(bestDist),
  };
}
