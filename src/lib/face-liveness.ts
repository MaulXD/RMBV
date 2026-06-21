type LandmarkPoint = { x: number; y: number };

/** Índices olho esquerdo/direito (68 landmarks face-api). */
const LEFT_EYE = [36, 37, 38, 39, 40, 41] as const;
const RIGHT_EYE = [42, 43, 44, 45, 46, 47] as const;

const CALIBRATION_FRAMES = 3;
const MIN_BASELINE = 0.08;
const CLOSED_RATIO = 0.65;
const STRONG_CLOSED_RATIO = 0.55;
const OPEN_RATIO = 0.72;

function dist(a: LandmarkPoint, b: LandmarkPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** Eye aspect ratio — olho fechado reduz o valor. */
export function eyeAspectRatio(positions: LandmarkPoint[], indices: readonly number[]): number {
  const p1 = positions[indices[0]!]!;
  const p2 = positions[indices[1]!]!;
  const p3 = positions[indices[2]!]!;
  const p4 = positions[indices[3]!]!;
  const p5 = positions[indices[4]!]!;
  const p6 = positions[indices[5]!]!;
  const vertical = dist(p2, p6) + dist(p3, p5);
  const horizontal = dist(p1, p4);
  if (horizontal <= 0) return 0;
  return vertical / (2 * horizontal);
}

export function averageEar(positions: LandmarkPoint[]): { left: number; right: number; avg: number } {
  const left = eyeAspectRatio(positions, LEFT_EYE);
  const right = eyeAspectRatio(positions, RIGHT_EYE);
  return { left, right, avg: (left + right) / 2 };
}

export type LivenessPhase = "need_face" | "need_close" | "need_open" | "passed";

export type LivenessTracker = {
  phase: LivenessPhase;
  baselineEar: number | null;
  calibration: number[];
  closedStreak: number;
  openStreak: number;
};

export type LivenessTick = {
  phase: LivenessPhase;
  passed: boolean;
  message: string;
  progress: number;
};

export function createLivenessTracker(): LivenessTracker {
  return {
    phase: "need_face",
    baselineEar: null,
    calibration: [],
    closedStreak: 0,
    openStreak: 0,
  };
}

export function resetLivenessTracker(): LivenessTracker {
  return createLivenessTracker();
}

/** face-api precisa de dimensões válidas no elemento video. */
export function isVideoReadyForDetection(video: HTMLVideoElement | null): boolean {
  if (!video) return false;
  return video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0;
}

export async function waitForVideoReady(
  video: HTMLVideoElement,
  timeoutMs = 4000,
): Promise<boolean> {
  if (isVideoReadyForDetection(video)) return true;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
    if (isVideoReadyForDetection(video)) return true;
  }
  return isVideoReadyForDetection(video);
}

function isEyesClosed(avg: number, eyeMin: number, baseline: number): boolean {
  return avg < baseline * CLOSED_RATIO || eyeMin < baseline * STRONG_CLOSED_RATIO;
}

function isEyesOpen(avg: number, baseline: number): boolean {
  return avg >= baseline * OPEN_RATIO;
}

export function tickLiveness(tracker: LivenessTracker, positions: LandmarkPoint[]): LivenessTick {
  const { left, right, avg } = averageEar(positions);
  const eyeMin = Math.min(left, right);

  switch (tracker.phase) {
    case "need_face": {
      if (avg < 0.06) {
        return {
          phase: "need_face",
          passed: false,
          message: "Centralize o rosto na câmera",
          progress: 0.1,
        };
      }

      tracker.calibration.push(avg);
      const calRatio = Math.min(tracker.calibration.length / CALIBRATION_FRAMES, 1);

      if (tracker.calibration.length >= CALIBRATION_FRAMES) {
        const base = median(tracker.calibration);
        if (base >= MIN_BASELINE) {
          tracker.baselineEar = base;
          tracker.phase = "need_close";
          tracker.closedStreak = 0;
          return {
            phase: "need_close",
            passed: false,
            message: "Feche os olhos por um instante",
            progress: 0.45,
          };
        }
        tracker.calibration.shift();
      }

      return {
        phase: "need_face",
        passed: false,
        message: "Olhe para a câmera com os olhos abertos",
        progress: 0.15 + calRatio * 0.25,
      };
    }

    case "need_close": {
      const baseline = tracker.baselineEar ?? avg;
      const stronglyClosed = avg < baseline * STRONG_CLOSED_RATIO;

      if (isEyesClosed(avg, eyeMin, baseline)) {
        tracker.closedStreak++;
        const needed = stronglyClosed ? 1 : 2;
        if (tracker.closedStreak >= needed) {
          tracker.phase = "need_open";
          tracker.openStreak = 0;
          tracker.closedStreak = 0;
          return {
            phase: "need_open",
            passed: false,
            message: "Agora abra os olhos",
            progress: 0.75,
          };
        }
      } else {
        tracker.closedStreak = 0;
      }

      return {
        phase: "need_close",
        passed: false,
        message: "Feche os olhos por um instante",
        progress: 0.45 + Math.min(tracker.closedStreak / 2, 1) * 0.2,
      };
    }

    case "need_open": {
      const baseline = tracker.baselineEar ?? avg;

      if (isEyesOpen(avg, baseline)) {
        tracker.openStreak++;
        if (tracker.openStreak >= 2) {
          tracker.phase = "passed";
          return {
            phase: "passed",
            passed: true,
            message: "Verificação concluída!",
            progress: 1,
          };
        }
      } else if (isEyesClosed(avg, eyeMin, baseline)) {
        tracker.openStreak = 0;
      }

      return {
        phase: "need_open",
        passed: false,
        message: "Abra os olhos de novo",
        progress: 0.78 + Math.min(tracker.openStreak / 2, 1) * 0.22,
      };
    }

    case "passed":
      return {
        phase: "passed",
        passed: true,
        message: "Verificação concluída!",
        progress: 1,
      };

    default:
      return {
        phase: "need_face",
        passed: false,
        message: "Olhe para a câmera",
        progress: 0,
      };
  }
}

export const LIVENESS_POLL_MS = 250;

/** Mesmos parâmetros usados no reconhecimento facial — evita falso “rosto não detectado”. */
export const LIVENESS_FACE_DETECT = {
  inputSize: 320,
  scoreThreshold: 0.5,
} as const;
