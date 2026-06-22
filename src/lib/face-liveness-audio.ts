import type { LivenessPhase } from "@/lib/face-liveness";

/** Fallback se a duração do MP3 ainda não carregou. */
export const LIVENESS_COMPLETE_DELAY_MS = 4200;

const LIVENESS_CUES: Record<LivenessPhase, string> = {
  need_face: "/audio/liveness/liveness-need-face.mp3",
  need_close: "/audio/liveness/liveness-need-close.mp3",
  need_open: "/audio/liveness/liveness-need-open.mp3",
  passed: "/audio/liveness/liveness-passed.mp3",
};

const FACE_LOST_CUE = "/audio/liveness/liveness-face-lost.mp3";

const cueDurationMs = new Map<string, number>();
const playQueue: string[] = [];
let queuePlaying = false;
let currentAudio: HTMLAudioElement | null = null;

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioContext();
    }
    void sharedAudioCtx.resume();
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

function cacheCueDuration(src: string, ms: number) {
  cueDurationMs.set(src, ms);
}

function loadCueDuration(src: string): Promise<number> {
  const cached = cueDurationMs.get(src);
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve) => {
    const audio = new Audio(src);
    const finish = (ms: number) => {
      cacheCueDuration(src, ms);
      resolve(ms);
    };
    audio.addEventListener(
      "loadedmetadata",
      () => finish(Math.ceil(audio.duration * 1000) + 400),
      { once: true },
    );
    audio.addEventListener("error", () => finish(LIVENESS_COMPLETE_DELAY_MS), { once: true });
    audio.load();
  });
}

function drainPlayQueue() {
  if (queuePlaying || playQueue.length === 0) return;
  const src = playQueue.shift()!;
  queuePlaying = true;
  const audio = new Audio(src);
  currentAudio = audio;
  const done = () => {
    if (currentAudio === audio) currentAudio = null;
    queuePlaying = false;
    drainPlayQueue();
  };
  audio.addEventListener("ended", done, { once: true });
  audio.addEventListener("error", done, { once: true });
  void audio.play().catch(done);
}

/** Enfileira áudio — toca um após o outro sem cortar. */
function playCue(src: string, { priority = false }: { priority?: boolean } = {}) {
  if (typeof window === "undefined") return;
  if (priority) {
    playQueue.length = 0;
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    queuePlaying = false;
  }
  playQueue.push(src);
  drainPlayQueue();
}

function playTone(freq: number, start: number, duration: number, volume = 0.14) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function playToneSequence(notes: Array<{ freq: number; at: number; dur: number; vol?: number }>) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const base = ctx.currentTime;
  for (const n of notes) {
    playTone(n.freq, base + n.at, n.dur, n.vol ?? 0.14);
  }
}

export function playLivenessThankYouTone() {
  playToneSequence([
    { freq: 523.25, at: 0, dur: 0.16, vol: 0.11 },
    { freq: 659.25, at: 0.18, dur: 0.16, vol: 0.12 },
  ]);
}

export function playLivenessSuccessTone() {
  playLivenessThankYouTone();
}

export function playLivenessAttentionTone() {
  playCue(FACE_LOST_CUE, { priority: true });
}

export function resetLivenessAudioFeedback() {
  playQueue.length = 0;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  queuePlaying = false;
}

export function cueLivenessPhase(phase: LivenessPhase) {
  playCue(LIVENESS_CUES[phase]);
}

/** Aguarda o MP3 de conclusão terminar antes de avançar o fluxo. */
export async function getLivenessPassedDelayMs(): Promise<number> {
  return loadCueDuration(LIVENESS_CUES.passed);
}

/** Pré-carrega áudios (necessário após gesto do usuário no mobile). */
export function warmupLivenessAudio() {
  if (typeof window === "undefined") return;
  const all = [...Object.values(LIVENESS_CUES), FACE_LOST_CUE];
  for (const src of all) {
    void loadCueDuration(src);
  }
  void getAudioContext()?.resume();
}
