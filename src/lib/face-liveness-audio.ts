import type { LivenessPhase } from "@/lib/face-liveness";

/** Aguarda o áudio de conclusão antes de avançar o fluxo. */
export const LIVENESS_COMPLETE_DELAY_MS = 3400;

const LIVENESS_CUES: Record<LivenessPhase, string> = {
  need_face: "/audio/liveness/liveness-need-face.mp3",
  need_close: "/audio/liveness/liveness-need-close.mp3",
  need_open: "/audio/liveness/liveness-need-open.mp3",
  passed: "/audio/liveness/liveness-passed.mp3",
};

const FACE_LOST_CUE = "/audio/liveness/liveness-face-lost.mp3";

let sharedAudioCtx: AudioContext | null = null;
let activeAudio: HTMLAudioElement | null = null;
const preloaded = new Map<string, HTMLAudioElement>();

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

function getAudio(src: string): HTMLAudioElement {
  let audio = preloaded.get(src);
  if (!audio) {
    audio = new Audio(src);
    audio.preload = "auto";
    preloaded.set(src, audio);
  }
  return audio;
}

function playCue(src: string) {
  if (typeof window === "undefined") return;
  resetLivenessAudioFeedback();
  const audio = getAudio(src);
  audio.currentTime = 0;
  activeAudio = audio;
  void audio.play().catch(() => {});
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

/** Melodia opcional (reserva para feedback sem voz). */
export function playLivenessThankYouTone() {
  playToneSequence([
    { freq: 523.25, at: 0, dur: 0.16, vol: 0.11 },
    { freq: 659.25, at: 0.18, dur: 0.16, vol: 0.12 },
    { freq: 783.99, at: 0.36, dur: 0.22, vol: 0.13 },
  ]);
}

export function playLivenessSuccessTone() {
  playLivenessThankYouTone();
}

export function playLivenessAttentionTone() {
  playCue(FACE_LOST_CUE);
}

export function resetLivenessAudioFeedback() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }
}

export function cueLivenessPhase(phase: LivenessPhase) {
  playCue(LIVENESS_CUES[phase]);
}

/** Pré-carrega áudios (necessário após gesto do usuário no mobile). */
export function warmupLivenessAudio() {
  if (typeof window === "undefined") return;
  for (const src of [...Object.values(LIVENESS_CUES), FACE_LOST_CUE]) {
    void getAudio(src).load();
  }
  void getAudioContext()?.resume();
}
