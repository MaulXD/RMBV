import type { LivenessPhase } from "@/lib/face-liveness";

const PHASE_CUE: Record<LivenessPhase, string> = {
  need_face: "Olhe para a câmera com os olhos abertos",
  need_close: "Feche os olhos com força",
  need_open: "Agora abra os olhos",
  passed: "Verificação concluída",
};

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

function pickPortugueseVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === "pt-BR") ??
    voices.find((v) => v.lang.startsWith("pt")) ??
    null
  );
}

function speakPortuguese(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "pt-BR";
  utterance.rate = 0.92;
  utterance.pitch = 1;
  const voice = pickPortugueseVoice();
  if (voice) utterance.voice = voice;
  synth.speak(utterance);
}

/** Tom curto de sucesso (dois bipes ascendentes). */
export function playLivenessSuccessTone() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const start = ctx.currentTime;
  for (const [i, freq] of [523.25, 659.25].entries()) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const t = start + i * 0.1;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    osc.start(t);
    osc.stop(t + 0.15);
  }
}

/** Tom de alerta leve quando o rosto sai do enquadramento. */
export function playLivenessAttentionTone() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = 440;
  osc.connect(gain);
  gain.connect(ctx.destination);
  const t = ctx.currentTime;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  osc.start(t);
  osc.stop(t + 0.13);
}

export function resetLivenessAudioFeedback() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

export function cueLivenessPhase(phase: LivenessPhase) {
  if (phase === "passed") {
    playLivenessSuccessTone();
  }
  speakPortuguese(PHASE_CUE[phase]);
}

/** Carrega vozes TTS (necessário em Safari/iOS). */
export function warmupLivenessAudio() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.getVoices();
  void getAudioContext()?.resume();
}
