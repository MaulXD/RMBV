"use client";

import { primeSessionCache } from "./SessionProvider";

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function AccessBlockedScreen({
  startHour,
  endHour,
  allowedDays,
}: {
  startHour: number;
  endHour: number;
  allowedDays: number[];
}) {
  const daysStr = allowedDays.map((d) => DAY_NAMES[d]).join(", ");

  function handleLogout() {
    primeSessionCache(null);
    void fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).finally(() => {
      window.location.assign("/");
    });
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/30">
          <svg viewBox="0 0 24 24" className="h-10 w-10 text-amber-500" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>

        <h1 className="mb-2 text-2xl font-bold text-foreground">
          Opa, obrigado pelo esforço!
        </h1>
        <p className="mb-1 text-base text-muted">
          Você não está no horário de trabalho.
        </p>
        <p className="mb-8 text-sm text-muted">
          Acesso permitido: <span className="font-semibold text-foreground">{daysStr}</span>,{" "}
          <span className="font-semibold text-foreground">{String(startHour).padStart(2, "0")}h</span> às{" "}
          <span className="font-semibold text-foreground">{String(endHour).padStart(2, "0")}h</span>.
        </p>

        <button
          type="button"
          className="btn-primary w-full"
          onClick={handleLogout}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sair do sistema
        </button>
      </div>
    </div>
  );
}
