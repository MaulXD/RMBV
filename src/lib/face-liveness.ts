type LandmarkPoint = { x: number; y: number };

/** Índices olho esquerdo/direito (68 landmarks face-api). */
const LEFT_EYE = [36, 37, 38, 39, 40, 41] as const;
const RIGHT_EYE = [42, 43, 44, 45, 46, 47] as const;

const EAR_CLOSED = 0.19;
const EAR_OPEN = 0.21;

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
  sawClosed: boolean;
};

export type LivenessTick = {
  phase: LivenessPhase;
  passed: boolean;
  message: string;
  progress: number;
};

export function createLivenessTracker(): LivenessTracker {
  return { phase: "need_face", sawClosed: false };
}

export function resetLivenessTracker(): LivenessTracker {
  return createLivenessTracker();
}

export function tickLiveness(tracker: LivenessTracker, positions: LandmarkPoint[]): LivenessTick {
  const { left, right } = averageEar(positions);
  const eyesClosed = left < EAR_CLOSED && right < EAR_CLOSED;
  const eyesOpen = left > EAR_OPEN && right > EAR_OPEN;

  switch (tracker.phase) {
    case "need_face":
      if (eyesOpen) {
        tracker.phase = "need_close";
        return {
          phase: "need_close",
          passed: false,
          message: "Feche os olhos por um instante",
          progress: 0.35,
        };
      }
      return {
        phase: "need_face",
        passed: false,
        message: "Olhe para a câmera com os olhos abertos",
        progress: 0.15,
      };

    case "need_close":
      if (eyesClosed) {
        tracker.sawClosed = true;
        tracker.phase = "need_open";
        return {
          phase: "need_open",
          passed: false,
          message: "Agora abra os olhos",
          progress: 0.65,
        };
      }
      return {
        phase: "need_close",
        passed: false,
        message: "Feche os olhos por um instante",
        progress: 0.4,
      };

    case "need_open":
      if (eyesOpen && tracker.sawClosed) {
        tracker.phase = "passed";
        return {
          phase: "passed",
          passed: true,
          message: "Verificação de presença concluída",
          progress: 1,
        };
      }
      if (!tracker.sawClosed) {
        tracker.phase = "need_close";
        return {
          phase: "need_close",
          passed: false,
          message: "Feche os olhos por um instante",
          progress: 0.4,
        };
      }
      return {
        phase: "need_open",
        passed: false,
        message: "Abra os olhos",
        progress: 0.75,
      };

    case "passed":
      return {
        phase: "passed",
        passed: true,
        message: "Verificação de presença concluída",
        progress: 1,
      };

    default:
      return {
        phase: tracker.phase,
        passed: false,
        message: "Olhe para a câmera",
        progress: 0,
      };
  }
}
