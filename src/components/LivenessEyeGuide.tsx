"use client";

import { useEffect, useRef, useState } from "react";
import Lottie, { type LottieRefCurrentProps } from "lottie-react";
import type { LivenessPhase } from "@/lib/face-liveness";

const OPEN_FRAME = 0;
const CLOSED_FRAME = 24;
const OPEN_AFTER_BLINK_FRAME = 48;

/** Animação Lottie de olhos abrindo/fechando na prova de vida. */
export function LivenessEyeGuide({ phase }: { phase: LivenessPhase | null }) {
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const [animationData, setAnimationData] = useState<object | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/lottie/eyes-liveness.json")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setAnimationData(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const player = lottieRef.current;
    if (!phase || !player || !animationData) return;

    if (phase === "need_face") {
      player.goToAndStop(OPEN_FRAME, true);
      return;
    }
    if (phase === "need_close") {
      player.playSegments([OPEN_FRAME, CLOSED_FRAME], true);
      return;
    }
    if (phase === "need_open") {
      player.playSegments([CLOSED_FRAME, OPEN_AFTER_BLINK_FRAME], true);
      return;
    }
    if (phase === "passed") {
      player.goToAndStop(OPEN_AFTER_BLINK_FRAME, true);
    }
  }, [phase, animationData]);

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
      <div className="flex min-h-[3.25rem] min-w-[6.5rem] items-center justify-center rounded-xl bg-black/75 px-2 py-1 ring-1 ring-white/15 backdrop-blur-sm">
        {phase === "passed" ? (
          <span className="text-lg font-bold text-emerald-400">OK</span>
        ) : animationData ? (
          <Lottie
            lottieRef={lottieRef}
            animationData={animationData}
            loop={false}
            autoplay={false}
            className="h-14 w-[7.5rem]"
          />
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
