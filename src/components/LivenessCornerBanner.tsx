"use client";

/** Instrução de prova de vida no canto da câmera — sem emoji, texto legível. */
export function LivenessCornerBanner({
  message,
  progress,
  variant = "dark",
}: {
  message: string;
  progress: number;
  variant?: "dark" | "kiosk";
}) {
  const panel =
    variant === "kiosk"
      ? "bg-gray-950/90 border-white/10"
      : "bg-black/80 border-white/15";

  return (
    <>
      <div
        className={`pointer-events-none absolute left-0 top-0 z-10 max-w-[88%] rounded-br-2xl border-r border-b px-3 py-2.5 backdrop-blur-sm sm:px-4 sm:py-3 ${panel}`}
      >
        <p className="text-sm font-bold leading-snug text-white sm:text-base">{message}</p>
      </div>
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-1 bg-white/15">
        <div
          className="h-full bg-violet-500 transition-all duration-200"
          style={{ width: `${Math.round(Math.min(Math.max(progress, 0), 1) * 100)}%` }}
        />
      </div>
    </>
  );
}
