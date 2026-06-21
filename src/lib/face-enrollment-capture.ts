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

export type PoseDirection = (typeof ENROLLMENT_POSE_STEPS)[number]["direction"];

const STABLE_FRAMES_REQUIRED = 3;
const MIN_DETECTION_SCORE = 0.6;
const MIN_QUALITY = 0.55;
const MAX_CENTER_OFFSET = 0.35;
const MAX_FRAME_JITTER = 0.06;

const YAW_CENTER_MAX = 0.12;
const YAW_SIDE_MIN = 0.2;
const PITCH_CENTER_MIN = 0.4;
const PITCH_CENTER_MAX = 0.54;
const PITCH_UP_MAX = 0.36;
const PITCH_DOWN_MIN = 0.58;

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

/** Métricas de pose a partir dos 68 landmarks (face-api). */
export function computePoseMetrics(positions: LandmarkPoint[]): PoseMetrics {
  const leftEye = avgPoints([36, 37, 38, 39, 40, 41].map((i) => positions[i]!));
  const rightEye = avgPoints([42, 43, 44, 45, 46, 47].map((i) => positions[i]!));
  const nose = positions[30]!;
  const jaw = positions[8]!;

  const eyeCenterX = (leftEye.x + rightEye.x) / 2;
  const eyeCenterY = (leftEye.y + rightEye.y) / 2;
  const eyeDist = Math.hypot(leftEye.x - rightEye.x, leftEye.y - rightEye.y) || 1;

  const yaw = (nose.x - eyeCenterX) / eyeDist;
  const pitch = (nose.y - eyeCenterY) / (jaw.y - nose.y || 1);

  return { yaw, pitch };
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

export function evaluatePose(direction: PoseDirection, metrics: PoseMetrics): PoseEvaluation {
  const { yaw, pitch } = metrics;

  switch (direction) {
    case "center": {
      if (Math.abs(yaw) > YAW_CENTER_MAX) {
        return {
          ok: false,
          kind: "wrong_pose",
          message: yaw > 0 ? "Centralize — vire um pouco para a esquerda" : "Centralize — vire um pouco para a direita",
          alignment: clamp01(1 - Math.abs(yaw) / 0.35),
        };
      }
      if (pitch < PITCH_UP_MAX) {
        return {
          ok: false,
          kind: "wrong_pose",
          message: "Olhe reto — cabeça inclinada para cima demais",
          alignment: clamp01((pitch - 0.25) / 0.15),
        };
      }
      if (pitch > PITCH_DOWN_MIN) {
        return {
          ok: false,
          kind: "wrong_pose",
          message: "Olhe reto — cabeça inclinada para baixo demais",
          alignment: clamp01((0.7 - pitch) / 0.15),
        };
      }
      return { ok: true, kind: "ok", message: "Pose correta — mantenha", alignment: 1 };
    }
    case "up": {
      if (pitch >= PITCH_CENTER_MIN) {
        return {
          ok: false,
          kind: "wrong_pose",
          message: "Incline a cabeça mais para cima",
          alignment: clamp01((PITCH_CENTER_MIN - pitch) / 0.12),
        };
      }
      if (Math.abs(yaw) > YAW_CENTER_MAX * 1.5) {
        return {
          ok: false,
          kind: "wrong_pose",
          message: "Mantenha o rosto centralizado ao inclinar",
          alignment: 0.35,
        };
      }
      return { ok: true, kind: "ok", message: "Boa! Mantenha inclinado para cima", alignment: clamp01((PITCH_CENTER_MIN - pitch) / 0.1) };
    }
    case "down": {
      if (pitch <= PITCH_CENTER_MAX) {
        return {
          ok: false,
          kind: "wrong_pose",
          message: "Incline a cabeça mais para baixo",
          alignment: clamp01((pitch - PITCH_CENTER_MAX) / 0.12),
        };
      }
      if (Math.abs(yaw) > YAW_CENTER_MAX * 1.5) {
        return {
          ok: false,
          kind: "wrong_pose",
          message: "Mantenha o rosto centralizado ao inclinar",
          alignment: 0.35,
        };
      }
      return { ok: true, kind: "ok", message: "Boa! Mantenha inclinado para baixo", alignment: clamp01((pitch - PITCH_CENTER_MAX) / 0.1) };
    }
    case "left": {
      if (yaw > -YAW_SIDE_MIN) {
        return {
          ok: false,
          kind: "wrong_pose",
          message: "Vire mais para a esquerda",
          alignment: clamp01((YAW_SIDE_MIN + yaw) / YAW_SIDE_MIN),
        };
      }
      if (pitch < PITCH_UP_MAX || pitch > PITCH_DOWN_MIN) {
        return {
          ok: false,
          kind: "wrong_pose",
          message: "Mantenha o queixo na horizontal",
          alignment: 0.4,
        };
      }
      return { ok: true, kind: "ok", message: "Boa! Mantenha virado à esquerda", alignment: clamp01(Math.abs(yaw) / 0.35) };
    }
    case "right": {
      if (yaw < YAW_SIDE_MIN) {
        return {
          ok: false,
          kind: "wrong_pose",
          message: "Vire mais para a direita",
          alignment: clamp01((YAW_SIDE_MIN - yaw) / YAW_SIDE_MIN),
        };
      }
      if (pitch < PITCH_UP_MAX || pitch > PITCH_DOWN_MIN) {
        return {
          ok: false,
          kind: "wrong_pose",
          message: "Mantenha o queixo na horizontal",
          alignment: 0.4,
        };
      }
      return { ok: true, kind: "ok", message: "Boa! Mantenha virado à direita", alignment: clamp01(yaw / 0.35) };
    }
    default:
      return { ok: false, kind: "wrong_pose", message: "Ajuste a pose", alignment: 0 };
  }
}

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

export function getStableProgress(tracker: AutoCaptureTracker): number {
  return tracker.stableCount / STABLE_FRAMES_REQUIRED;
}
