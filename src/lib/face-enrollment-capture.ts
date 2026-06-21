/** Passos do cadastro facial multi-pose (5 capturas automáticas). */
export const ENROLLMENT_POSE_STEPS = [
  {
    label: "Frente",
    hint: "Olhe direto para a câmera",
    direction: "center" as const,
  },
  {
    label: "Para cima",
    hint: "Incline a cabeça levemente para cima",
    direction: "up" as const,
  },
  {
    label: "Para baixo",
    hint: "Incline a cabeça levemente para baixo",
    direction: "down" as const,
  },
  {
    label: "Esquerda",
    hint: "Vire levemente a cabeça para a esquerda",
    direction: "left" as const,
  },
  {
    label: "Direita",
    hint: "Vire levemente a cabeça para a direita",
    direction: "right" as const,
  },
] as const;

export const ENROLLMENT_CAPTURE_COUNT = ENROLLMENT_POSE_STEPS.length;

const STABLE_FRAMES_REQUIRED = 3;
const MIN_DETECTION_SCORE = 0.6;
const MIN_QUALITY = 0.55;
const MAX_CENTER_OFFSET = 0.35;
const MAX_FRAME_JITTER = 0.06;

export type FaceBox = { x: number; y: number; width: number; height: number };

export function faceCenterScore(box: FaceBox, videoW: number, videoH: number): number {
  if (videoW <= 0 || videoH <= 0) return 0;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const dx = Math.abs(cx - videoW / 2) / videoW;
  const dy = Math.abs(cy - videoH / 2) / videoH;
  const offset = Math.max(dx, dy);
  if (offset > MAX_CENTER_OFFSET) return 0;
  return 1 - offset / MAX_CENTER_OFFSET;
}

export function frameQuality(detectionScore: number, box: FaceBox, videoW: number, videoH: number): number {
  if (detectionScore < MIN_DETECTION_SCORE) return 0;
  const center = faceCenterScore(box, videoW, videoH);
  const sizeScore = Math.min(1, box.width / (videoW * 0.35));
  return detectionScore * 0.45 + center * 0.4 + sizeScore * 0.15;
}

export function boxCenter(box: FaceBox) {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

export function isBoxStable(
  prev: { x: number; y: number } | null,
  next: { x: number; y: number },
  boxWidth: number,
): boolean {
  if (!prev || boxWidth <= 0) return false;
  const dx = Math.abs(next.x - prev.x) / boxWidth;
  const dy = Math.abs(next.y - prev.y) / boxWidth;
  return dx < MAX_FRAME_JITTER && dy < MAX_FRAME_JITTER;
}

export type AutoCaptureTracker = {
  stableCount: number;
  bestQuality: number;
  bestDescriptor: number[] | null;
  lastCenter: { x: number; y: number } | null;
};

export function createAutoCaptureTracker(): AutoCaptureTracker {
  return { stableCount: 0, bestQuality: 0, bestDescriptor: null, lastCenter: null };
}

export function resetAutoCaptureTracker(): AutoCaptureTracker {
  return createAutoCaptureTracker();
}

/**
 * Atualiza tracker; retorna descritor quando atingir estabilidade suficiente.
 */
export function tickAutoCapture(
  tracker: AutoCaptureTracker,
  descriptor: Float32Array,
  quality: number,
  box: FaceBox,
): { ready: boolean; descriptor: number[] | null } {
  if (quality < MIN_QUALITY) {
    tracker.stableCount = 0;
    tracker.bestQuality = 0;
    tracker.bestDescriptor = null;
    tracker.lastCenter = null;
    return { ready: false, descriptor: null };
  }

  const center = boxCenter(box);
  if (!isBoxStable(tracker.lastCenter, center, box.width)) {
    tracker.stableCount = 0;
    tracker.bestQuality = quality;
    tracker.bestDescriptor = Array.from(descriptor);
    tracker.lastCenter = center;
    return { ready: false, descriptor: null };
  }

  tracker.stableCount += 1;
  tracker.lastCenter = center;
  if (quality > tracker.bestQuality) {
    tracker.bestQuality = quality;
    tracker.bestDescriptor = Array.from(descriptor);
  }

  if (tracker.stableCount >= STABLE_FRAMES_REQUIRED && tracker.bestDescriptor) {
    const result = tracker.bestDescriptor;
    Object.assign(tracker, resetAutoCaptureTracker());
    return { ready: true, descriptor: result };
  }

  return { ready: false, descriptor: null };
}
