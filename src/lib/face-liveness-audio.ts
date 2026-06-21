import type { LivenessPhase } from "@/lib/face-liveness";

/** Aguarda o áudio de conclusão terminar antes de avançar o fluxo. */
export const LIVENESS_COMPLETE_DELAY_MS = 2400;

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

/** Melodia de conclusão + agradecimento (~1,6 s). */
export function playLivenessThankYouTone() {
  playToneSequence([
    { freq: 523.25, at: 0, dur: 0.16, vol: 0.13 },
    { freq: 659.25, at: 0.18, dur: 0.16, vol: 0.14 },
    { freq: 783.99, at: 0.36, dur: 0.22, vol: 0.15 },
    { freq: 987.77, at: 0.62, dur: 0.28, vol: 0.14 },
    { freq: 880, at: 0.95, dur: 0.45, vol: 0.12 },
  ]);
}

export function playLivenessSuccessTone() {
  playLivenessThankYouTone();
}

export function playLivenessAttentionTone() {
  playToneSequence([
    { freq: 440, at: 0, dur: 0.1, vol: 0.1 },
    { freq: 370, at: 0.12, dur: 0.12, vol: 0.1 },
  ]);
}

function playPhaseTone(phase: LivenessPhase) {
  switch (phase) {
    case "need_face":
      playToneSequence([{ freq: 880, at: 0, dur: 0.1, vol: 0.11 }]);
      break;
    case "need_close":
      playToneSequence([
        { freq: 620, at: 0, dur: 0.11, vol: 0.12 },
        { freq: 520, at: 0.14, dur: 0.14, vol: 0.12 },
      ]);
      break;
    case "need_open":
      playToneSequence([
        { freq: 520, at: 0, dur: 0.08, vol: 0.11 },
        { freq: 740, at: 0.1, dur: 0.14, vol: 0.14 },
      ]);
      break;
    case "passed":
      playLivenessThankYouTone();
      break;
    default:
      break;
  }
}

export function resetLivenessAudioFeedback() {
  /* tons curtos — nada a cancelar */
}

export function cueLivenessPhase(phase: LivenessPhase) {
  playPhaseTone(phase);
}

export function warmupLivenessAudio() {
  void getAudioContext()?.resume();
}
