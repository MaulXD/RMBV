"use client";

import { useEffect, useRef } from "react";
import type { LivenessPhase } from "@/lib/face-liveness";
import {
  cueLivenessPhase,
  playLivenessAttentionTone,
  resetLivenessAudioFeedback,
  warmupLivenessAudio,
} from "@/lib/face-liveness-audio";

/** Feedback de voz na prova de vida — fala ao mudar de fase. */
export function useLivenessAudioFeedback(
  active: boolean,
  phase: LivenessPhase | null,
  faceLost = false,
) {
  const lastPhaseRef = useRef<LivenessPhase | null>(null);
  const faceLostSpokenRef = useRef(false);

  useEffect(() => {
    warmupLivenessAudio();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const onVoices = () => warmupLivenessAudio();
      window.speechSynthesis.addEventListener("voiceschanged", onVoices);
      return () => window.speechSynthesis.removeEventListener("voiceschanged", onVoices);
    }
  }, []);

  useEffect(() => {
    if (!active) {
      lastPhaseRef.current = null;
      faceLostSpokenRef.current = false;
      resetLivenessAudioFeedback();
      return;
    }

    if (faceLost) {
      if (!faceLostSpokenRef.current) {
        faceLostSpokenRef.current = true;
        playLivenessAttentionTone();
      }
      return;
    }

    faceLostSpokenRef.current = false;

    if (!phase || phase === lastPhaseRef.current) return;
    lastPhaseRef.current = phase;
    cueLivenessPhase(phase);
  }, [active, phase, faceLost]);

  useEffect(() => () => resetLivenessAudioFeedback(), []);
}
