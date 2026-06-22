"use client";

import { useEffect, useRef, useState } from "react";
import Lottie, { type LottieRefCurrentProps } from "lottie-react";
import type { LivenessPhase } from "@/lib/face-liveness";

/** Eye blinking.json — 60 fps, blink completo em 120 frames (fecha ~frame 80). */
const OPEN_FRAME = 0;
const CLOSED_FRAME = 80;
const OPEN_END_FRAME = 119;

const LOTTIE_URL = "/lottie/eye-blink.json";

function syncEyePhase(player: LottieRefCurrentProps | null, phase: LivenessPhase) {
  if (!player) return;

  if (phase === "need_face") {
    player.goToAndStop(OPEN_FRAME, true);
    return;
  }
  if (phase === "need_close") {
    player.goToAndPlay(OPEN_FRAME, true);
    return;
  }
  if (phase === "need_open") {
    player.playSegments([CLOSED_FRAME, OPEN_END_FRAME], true);
    return;
  }
  if (phase === "passed") {
    player.goToAndStop(OPEN_FRAME, true);
  }
}

function BlinkingEye({
  animationData,
  phase,
}: {
  animationData: object;
  phase: LivenessPhase;
}) {
  const lottieRef = useRef<LottieRefCurrentProps>(null);

  useEffect(() => {
    syncEyePhase(lottieRef.current, phase);
  }, [phase, animationData]);

  return (
    <Lottie
      lottieRef={lottieRef}
      animationData={animationData}
      loop={phase === "need_close"}
      autoplay={false}
      className="h-11 w-11 invert"
      aria-hidden
    />
  );
}

/** Dois olhos com animação Lottie na prova de vida. */
export function LivenessEyeGuide({ phase }: { phase: LivenessPhase | null }) {
  const [animationData, setAnimationData] = useState<object | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch(LOTTIE_URL)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setAnimationData(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!phase) return null;

  const label =
    phase === "need_close"
      ? "Feche"
      : phase === "need_open"
        ? "Abra"
        : phase === "passed"
          ? "Pronto"
          : "Olhos abertos";

  return (
    <div className="pointer-events-none absolute bottom-3 right-3 z-10 flex flex-col items-end gap-1.5 sm:bottom-4 sm:right-4">
      <div className="flex min-h-[3.25rem] items-center justify-center gap-2 rounded-xl bg-black/75 px-3 py-1.5 ring-1 ring-white/15 backdrop-blur-sm">
        {phase === "passed" ? (
          <span className="px-2 text-lg font-bold text-emerald-400">OK</span>
        ) : animationData ? (
          <>
            <BlinkingEye animationData={animationData} phase={phase} />
            <BlinkingEye animationData={animationData} phase={phase} />
          </>
        ) : (
          <span className="text-[10px] text-white/50">…</span>
        )}
      </div>
      <span className="rounded-md bg-black/70 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/80">
        {label}
      </span>
    </div>
  );
}
