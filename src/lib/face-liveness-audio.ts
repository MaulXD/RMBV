import type { LivenessPhase } from "@/lib/face-liveness";

/** Aguarda fala + melodia de conclusão antes de avançar o fluxo. */
export const LIVENESS_COMPLETE_DELAY_MS = 2800;

const PHASE_CUE: Record<LivenessPhase, string> = {
  need_face: "Olhe para a câmera com os olhos abertos",
  need_close: "Feche os olhos por um momento",
  need_open: "Pronto",
  passed: "Verificação concluída",
};

const FACE_LOST_CUE = "Centralize o rosto no oval";

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

function scorePortugueseVoice(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase();
  const lang = voice.lang.toLowerCase();
  let score = 0;
  if (lang === "pt-br") score += 100;
  else if (lang.startsWith("pt")) score += 60;
  if (name.includes("google")) score += 35;
  if (/luciana|francisca|joana|fernanda|vitória|vitoria|camila/.test(name)) score += 28;
  if (/natural|premium|enhanced|neural/.test(name)) score += 18;
  if (/microsoft.*david|daniel|heloisa|male|homem|zira/.test(name)) score -= 30;
  if (voice.localService) score += 4;
  return score;
}

function pickPortugueseVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -Infinity;
  for (const voice of voices) {
    if (!voice.lang.toLowerCase().startsWith("pt")) continue;
    const score = scorePortugueseVoice(voice);
    if (score > bestScore) {
      bestScore = score;
      best = voice;
    }
  }
  return best;
}

function speakPortuguese(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "pt-BR";
  utterance.rate = 0.94;
  utterance.pitch = 0.98;
  const voice = pickPortugueseVoice();
  if (voice) utterance.voice = voice;
  synth.speak(utterance);
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

/** Melodia suave após a fala de conclusão. */
export function playLivenessThankYouTone() {
  playToneSequence([
    { freq: 523.25, at: 0, dur: 0.16, vol: 0.11 },
    { freq: 659.25, at: 0.18, dur: 0.16, vol: 0.12 },
    { freq: 783.99, at: 0.36, dur: 0.22, vol: 0.13 },
    { freq: 987.77, at: 0.62, dur: 0.28, vol: 0.12 },
    { freq: 880, at: 0.95, dur: 0.45, vol: 0.1 },
  ]);
}

export function playLivenessSuccessTone() {
  playLivenessThankYouTone();
}

export function playLivenessAttentionTone() {
  speakPortuguese(FACE_LOST_CUE);
}

export function resetLivenessAudioFeedback() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

export function cueLivenessPhase(phase: LivenessPhase) {
  speakPortuguese(PHASE_CUE[phase]);
  if (phase === "passed") {
    window.setTimeout(() => playLivenessThankYouTone(), 1100);
  }
}

/** Carrega vozes TTS (necessário em Safari/iOS). */
export function warmupLivenessAudio() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.getVoices();
  void getAudioContext()?.resume();
}
