"use client";

import type { LivenessPhase } from "@/lib/face-liveness";

function Eye({ closed, opening }: { closed: boolean; opening: boolean }) {
  const anim = closed
    ? "liveness-eye-closed"
    : opening
      ? "liveness-eye-opening"
      : "liveness-eye-open";

  return (
    <div className="relative h-7 w-10 overflow-hidden rounded-full bg-white/15 ring-1 ring-white/30">
      <div className="absolute inset-x-1 top-1/2 h-5 -translate-y-1/2">
        <div className={`h-full w-full rounded-full bg-white ${anim}`} style={{ transformOrigin: "center" }} />
      </div>
    </div>
  );
}

/** Animação de olhos abrindo/fechando durante a prova de vida. */
export function LivenessEyeGuide({ phase }: { phase: LivenessPhase | null }) {
  if (!phase) return null;

  const closed = phase === "need_close";
  const opening = phase === "need_open";
  const passed = phase === "passed";

  return (
    <div className="pointer-events-none absolute bottom-3 right-3 z-10 flex flex-col items-end gap-1.5 sm:bottom-4 sm:right-4">
      <div className="flex gap-2 rounded-xl bg-black/75 px-3 py-2 ring-1 ring-white/15 backdrop-blur-sm">
        {passed ? (
          <div className="flex h-7 w-[5.5rem] items-center justify-center">
            <span className="text-lg font-bold text-emerald-400">OK</span>
          </div>
        ) : (
          <>
            <Eye closed={closed} opening={opening} />
            <Eye closed={closed} opening={opening} />
          </>
        )}
      </div>
      <span className="rounded-md bg-black/70 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/80">
        {closed ? "Feche" : opening ? "Abra" : passed ? "Pronto" : "Olhos abertos"}
      </span>
    </div>
  );
}
