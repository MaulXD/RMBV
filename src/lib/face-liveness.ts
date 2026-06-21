type LandmarkPoint = { x: number; y: number };

/** Índices olho esquerdo/direito (68 landmarks face-api). */
const LEFT_EYE = [36, 37, 38, 39, 40, 41] as const;
const RIGHT_EYE = [42, 43, 44, 45, 46, 47] as const;

/** Frames com rosto antes de pedir piscada. */
const READY_FRAMES = 2;
/** Atualiza pico de olhos abertos. */
const PEAK_UPDATE_RATIO = 0.84;
/** Olho fechado vs pico recente. */
const CLOSED_VS_PEAK = 0.8;
/** Queda relativa entre frames consecutivos (piscada rápida). */
const SUDDEN_DROP_RATIO = 0.07;
/** Queda relativa vs pico acumulado. */
const DROP_VS_PEAK = 0.1;
/** Olhos abertos de novo após piscada. */
const OPEN_VS_PEAK = 0.72;

function dist(a: LandmarkPoint, b: LandmarkPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y);
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
  readyFrames: number;
  peakEar: number;
  blinkRefEar: number;
  lastEar: number | null;
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
    readyFrames: 0,
    peakEar: 0,
    blinkRefEar: 0,
    lastEar: null,
    closedStreak: 0,
    openStreak: 0,
  };
}

export function resetLivenessTracker(): LivenessTracker {
  return createLivenessTracker();
}

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

function hasValidFace(left: number, right: number, avg: number): boolean {
  return avg >= 0.035 && (left >= 0.025 || right >= 0.025);
}

function isClosedNow(avg: number, peakEar: number, lastEar: number | null): boolean {
  if (peakEar <= 0) return false;
  const dropFromPeak = (peakEar - avg) / peakEar;
  const suddenDrop =
    lastEar !== null && lastEar > 0 && (lastEar - avg) / lastEar >= SUDDEN_DROP_RATIO;
  return avg < peakEar * CLOSED_VS_PEAK || dropFromPeak >= DROP_VS_PEAK || suddenDrop;
}

function isOpenNow(avg: number, refEar: number): boolean {
  if (refEar <= 0) return avg >= 0.04;
  return avg >= refEar * OPEN_VS_PEAK;
}

export function tickLiveness(tracker: LivenessTracker, positions: LandmarkPoint[]): LivenessTick {
  const { left, right, avg } = averageEar(positions);
  const prevEar = tracker.lastEar;
  tracker.lastEar = avg;

  if (!hasValidFace(left, right, avg)) {
    return {
      phase: tracker.phase,
      passed: false,
      message: "Centralize o rosto na câmera",
      progress: tracker.phase === "passed" ? 1 : 0.1,
    };
  }

  switch (tracker.phase) {
    case "need_face": {
      tracker.readyFrames++;
      tracker.peakEar = Math.max(tracker.peakEar, avg);
      const ratio = Math.min(tracker.readyFrames / READY_FRAMES, 1);

      if (tracker.readyFrames >= READY_FRAMES) {
        tracker.peakEar = Math.max(tracker.peakEar, avg);
        tracker.blinkRefEar = tracker.peakEar;
        tracker.phase = "need_close";
        tracker.closedStreak = 0;
        tracker.openStreak = 0;
        return {
          phase: "need_close",
          passed: false,
          message: "Feche os olhos com força",
          progress: 0.45,
        };
      }

      return {
        phase: "need_face",
        passed: false,
        message: "Olhe para a câmera com os olhos abertos",
        progress: 0.15 + ratio * 0.25,
      };
    }

    case "need_close": {
      if (avg >= tracker.peakEar * PEAK_UPDATE_RATIO) {
        tracker.peakEar = Math.max(tracker.peakEar, avg);
        tracker.blinkRefEar = tracker.peakEar;
      }

      if (isClosedNow(avg, tracker.peakEar, prevEar)) {
        tracker.closedStreak++;
        if (tracker.closedStreak >= 1) {
          tracker.phase = "need_open";
          tracker.openStreak = 0;
          tracker.closedStreak = 0;
          return {
            phase: "need_open",
            passed: false,
            message: "Agora abra os olhos",
            progress: 0.78,
          };
        }
      } else {
        tracker.closedStreak = 0;
      }

      return {
        phase: "need_close",
        passed: false,
        message: "Feche os olhos com força",
        progress: 0.45 + Math.min(tracker.closedStreak, 1) * 0.25,
      };
    }

    case "need_open": {
      const ref = tracker.blinkRefEar || tracker.peakEar;

      if (isOpenNow(avg, ref)) {
        tracker.openStreak++;
        if (tracker.openStreak >= 1) {
          tracker.phase = "passed";
          return {
            phase: "passed",
            passed: true,
            message: "Verificação concluída!",
            progress: 1,
          };
        }
      } else if (isClosedNow(avg, ref, prevEar)) {
        tracker.openStreak = 0;
      }

      return {
        phase: "need_open",
        passed: false,
        message: "Abra os olhos de novo",
        progress: 0.8 + Math.min(tracker.openStreak, 1) * 0.2,
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

/** Piscada dura ~150–400 ms — amostrar rápido o suficiente. */
export const LIVENESS_POLL_MS = 120;

export const LIVENESS_FACE_DETECT = {
  inputSize: 416,
  scoreThreshold: 0.4,
} as const;
