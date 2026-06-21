"use client";

import { Icon } from "./ui/Icon";
import type { PoseDirection } from "@/lib/face-enrollment-capture";

const NUDGE_CLASS: Record<Exclude<PoseDirection, "center">, string> = {
  left: "liveness-guide-nudge-left",
  right: "liveness-guide-nudge-right",
  up: "liveness-guide-nudge-up",
  down: "liveness-guide-nudge-down",
};

/** Seta animada — esquerda/direita alinhadas ao preview espelhado (label = lado na tela). */
export function PoseDirectionGuide({
  direction,
  active,
  ok,
}: {
  direction: PoseDirection;
  active: boolean;
  ok: boolean;
}) {
  if (direction === "center") {
    return (
      <div className="absolute left-1/2 top-2 z-10 -translate-x-1/2">
        <span
          className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full transition-all duration-200 ${
            ok
              ? "bg-emerald-500/95 text-white scale-110 shadow-lg ring-2 ring-white/50"
              : active
                ? "bg-amber-500/90 text-white liveness-guide-pulse shadow-md ring-2 ring-white/40"
                : "bg-white/20 text-white shadow-md ring-2 ring-white/30"
          }`}
        >
          <Icon name="circleDot" className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.25} />
        </span>
        <span className="mt-1 block text-center text-[10px] font-bold uppercase tracking-wider text-white drop-shadow">
          Frente
        </span>
      </div>
    );
  }

  const side: Record<
    Exclude<PoseDirection, "center">,
    { pos: string; icon: "chevronLeft" | "chevronRight" | "arrowUp" | "arrowDown"; label: string }
  > = {
    left: { pos: "left-1 top-1/2 -translate-y-1/2", icon: "chevronLeft", label: "Esquerda" },
    right: { pos: "right-1 top-1/2 -translate-y-1/2", icon: "chevronRight", label: "Direita" },
    up: { pos: "top-1 left-1/2 -translate-x-1/2", icon: "arrowUp", label: "Cima" },
    down: { pos: "bottom-1 left-1/2 -translate-x-1/2", icon: "arrowDown", label: "Baixo" },
  };

  const cfg = side[direction];
  const shell = ok
    ? "bg-emerald-500/95 ring-white/60"
    : active
      ? "bg-amber-500/90 ring-white/50"
      : "bg-primary/95 ring-white/40";

  return (
    <div className={`absolute z-10 flex flex-col items-center gap-1 ${cfg.pos}`}>
      <div className={`flex flex-col items-center gap-1 ${NUDGE_CLASS[direction]}`}>
        <span
          className={`flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full text-white shadow-lg ring-2 transition-colors duration-200 ${shell}`}
        >
          <Icon name={cfg.icon} className="h-8 w-8 sm:h-9 sm:w-9" strokeWidth={2.75} />
        </span>
        <span className="rounded-md bg-black/75 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
          {cfg.label}
        </span>
      </div>
    </div>
  );
}
