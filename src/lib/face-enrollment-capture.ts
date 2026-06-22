/** Cadastro facial — só frente, sem inclinar a cabeça. */
export const ENROLLMENT_POSE_STEPS = [
  {
    label: "Frente",
    hint: "Olhe direto para a câmera e mantenha o rosto no molde",
    direction: "center" as const,
  },
] as const;

/** Passo único na UI (após prova de vida). */
export const ENROLLMENT_CAPTURE_COUNT = ENROLLMENT_POSE_STEPS.length;

/** Amostras estáveis na mesma pose — média melhora o reconhecimento no ponto. */
export const ENROLLMENT_SAMPLE_FRAMES = 4;

export const ENROLLMENT_DESCRIPTOR_WEIGHTS = [1] as const;

/** Pesos quando envia ENROLLMENT_SAMPLE_FRAMES amostras da frente. */
export const ENROLLMENT_SAMPLE_WEIGHTS = [1.5, 1, 1, 1] as const;

export type PoseDirection = (typeof ENROLLMENT_POSE_STEPS)[number]["direction"];

const STABLE_FRAMES_REQUIRED = 2;
const MIN_DETECTION_SCORE = 0.55;
const MIN_QUALITY = 0.48;
const MAX_CENTER_OFFSET = 0.38;
const MAX_FRAME_JITTER = 0.08;

const YAW_CENTER_MAX = 0.16;
const PITCH_UP_MAX = 0.32;
const PITCH_DOWN_MIN = 0.62;

export type FaceBox = { x: number; y: number; width: number; height: number };

export type PoseMetrics = { yaw: number; pitch: number };

export type PoseFeedbackKind = "ok" | "wrong_pose" | "no_face" | "low_quality" | "stabilizing";

export type PoseEvaluation = {
  ok: boolean;
  kind: PoseFeedbackKind;
  message: string;
  /** 0–1 alinhamento com a pose pedida */
  alignment: number;
};

type LandmarkPoint = { x: number; y: number };

function avgPoints(points: LandmarkPoint[]): LandmarkPoint {
  const n = points.length || 1;
  return {
    x: points.reduce((s, p) => s + p.x, 0) / n,
    y: points.reduce((s, p) => s + p.y, 0) / n,
  };
}

export function computePoseMetrics(positions: LandmarkPoint[]): PoseMetrics {
  const leftEye = avgPoints([36, 37, 38, 39, 40, 41].map((i) => positions[i]!));
  const rightEye = avgPoints([42, 43, 44, 45, 46, 47].map((i) => positions[i]!));
  const nose = positions[30]!;
  const chin = positions[8]!;
  const forehead = positions[27]!;
  const eyeCenterX = (leftEye.x + rightEye.x) / 2;
  const eyeCenterY = (leftEye.y + rightEye.y) / 2;
  const eyeDist = Math.hypot(leftEye.x - rightEye.x, leftEye.y - rightEye.y) || 1;
  const faceHeight = Math.hypot(chin.x - forehead.x, chin.y - forehead.y) || 1;
  const yaw = (nose.x - eyeCenterX) / eyeDist;
  const pitch = (nose.y - eyeCenterY) / faceHeight;
  return { yaw, pitch };
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

export function evaluatePose(direction: PoseDirection, metrics: PoseMetrics): PoseEvaluation {
  const { yaw, pitch } = metrics;

  if (direction !== "center") {
    return { ok: false, kind: "wrong_pose", message: "Ajuste a pose", alignment: 0 };
  }

  if (Math.abs(yaw) > YAW_CENTER_MAX) {
    return {
      ok: false,
      kind: "wrong_pose",
      message: yaw > 0 ? "Centralize — vire levemente para a esquerda" : "Centralize — vire levemente para a direita",
      alignment: clamp01(1 - Math.abs(yaw) / 0.4),
    };
  }
  if (pitch < PITCH_UP_MAX) {
    return {
      ok: false,
      kind: "wrong_pose",
      message: "Olhe reto para a câmera",
      alignment: clamp01((pitch - 0.22) / 0.15),
    };
  }
  if (pitch > PITCH_DOWN_MIN) {
    return {
      ok: false,
      kind: "wrong_pose",
      message: "Olhe reto para a câmera",
      alignment: clamp01((0.75 - pitch) / 0.15),
    };
  }
  return { ok: true, kind: "ok", message: "Mantenha o rosto no molde", alignment: 1 };
}

export function faceCenterScore(
  box: FaceBox,
  videoW: number,
  videoH: number,
  maxOffset = MAX_CENTER_OFFSET,
): number {
  if (videoW <= 0 || videoH <= 0) return 0;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const dx = Math.abs(cx - videoW / 2) / videoW;
  const dy = Math.abs(cy - videoH / 2) / videoH;
  const offset = Math.max(dx, dy);
  if (offset > maxOffset) return 0;
  return 1 - offset / maxOffset;
}

export function frameQuality(
  detectionScore: number,
  box: FaceBox,
  videoW: number,
  videoH: number,
): number {
  if (detectionScore < MIN_DETECTION_SCORE) return 0;
  const center = faceCenterScore(box, videoW, videoH, MAX_CENTER_OFFSET);
  const sizeScore = Math.min(1, box.width / (videoW * 0.26));
  return detectionScore * 0.45 + center * 0.4 + sizeScore * 0.15;
}

export function boxCenter(box: FaceBox) {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

export function isBoxStable(
  prev: { x: number; y: number } | null,
  next: { x: number; y: number },
  boxWidth: number,
  maxJitter = MAX_FRAME_JITTER,
): boolean {
  if (!prev || boxWidth <= 0) return false;
  const dx = Math.abs(next.x - prev.x) / boxWidth;
  const dy = Math.abs(next.y - prev.y) / boxWidth;
  return dx < maxJitter && dy < maxJitter;
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
 * Atualiza tracker; retorna descritor quando pose correta + estabilidade suficiente.
 */
export function tickAutoCapture(
  tracker: AutoCaptureTracker,
  descriptor: Float32Array,
  quality: number,
  box: FaceBox,
  poseOk: boolean,
): { ready: boolean; descriptor: number[] | null } {
  if (!poseOk || quality < MIN_QUALITY) {
    tracker.stableCount = 0;
    tracker.bestQuality = 0;
    tracker.bestDescriptor = null;
    tracker.lastCenter = null;
    return { ready: false, descriptor: null };
  }

  const center = boxCenter(box);
  if (!isBoxStable(tracker.lastCenter, center, box.width, MAX_FRAME_JITTER)) {
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

export function getStableProgress(tracker: AutoCaptureTracker): number {
  return tracker.stableCount / STABLE_FRAMES_REQUIRED;
}
