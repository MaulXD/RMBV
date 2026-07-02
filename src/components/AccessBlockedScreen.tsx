"use client";

import { useEffect, useState } from "react";
import { primeSessionCache, useSession } from "./SessionProvider";

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DAY_NAMES_FULL = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

function getGreeting(hour: number) {
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

function getNextAllowed(allowedDays: number[], startHour: number): string {
  const now = new Date();
  const currentDay = now.getDay();
  const currentHour = now.getHours();

  // Check if today is allowed and we're before start time
  if (allowedDays.includes(currentDay) && currentHour < startHour) {
    return `às ${String(startHour).padStart(2, "0")}h de hoje`;
  }

  // Find next allowed day
  for (let i = 1; i <= 7; i++) {
    const nextDay = (currentDay + i) % 7;
    if (allowedDays.includes(nextDay)) {
      if (i === 1) return `às ${String(startHour).padStart(2, "0")}h amanhã`;
      return `${DAY_NAMES_FULL[nextDay]} às ${String(startHour).padStart(2, "0")}h`;
    }
  }
  return `às ${String(startHour).padStart(2, "0")}h`;
}

export function AccessBlockedScreen({
  startHour,
  endHour,
  allowedDays,
}: {
  startHour: number;
  endHour: number;
  allowedDays: number[];
}) {
  const { user } = useSession();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const greeting = getGreeting(now.getHours());
  const nextAllowed = getNextAllowed(allowedDays, startHour);
  const daysStr = allowedDays.map((d) => DAY_NAMES[d]).join(", ");
  const firstName = user?.name?.split(" ")[0] ?? "";

  function handleLogout() {
    primeSessionCache(null);
    void fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).finally(() => {
      window.location.assign("/");
    });
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-between overflow-hidden px-6 py-10"
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #0f172a 100%)",
      }}
    >
      {/* Subtle grid texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: "linear-gradient(#6366f1 1px, transparent 1px), linear-gradient(90deg, #6366f1 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Glow orbs */}
      <div className="pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600/20 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-1/4 right-1/4 h-72 w-72 translate-x-1/2 translate-y-1/2 rounded-full bg-violet-600/15 blur-[100px]" />

      {/* Top — Logo */}
      <div className="relative z-10 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 ring-1 ring-indigo-400/30">
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-indigo-300" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
        <span className="text-sm font-bold tracking-widest text-white/40 uppercase">SCS</span>
      </div>

      {/* Center — main content */}
      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Live clock */}
        <div className="mb-3 font-mono text-7xl font-thin tracking-tight text-white sm:text-8xl">
          <span>{hours}</span>
          <span className="animate-pulse text-indigo-400">:</span>
          <span>{minutes}</span>
          <span className="ml-2 text-3xl text-white/30 sm:text-4xl">{seconds}</span>
        </div>

        {/* Divider */}
        <div className="mb-8 h-px w-24 bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent" />

        {/* Greeting */}
        {firstName && (
          <p className="mb-2 text-lg font-medium text-white/60">
            {greeting}, <span className="font-semibold text-white/90">{firstName}</span>
          </p>
        )}

        <h1 className="mb-3 text-3xl font-bold text-white sm:text-4xl">
          Obrigado pelo esforço!
        </h1>

        <p className="mb-1 text-base text-white/50">
          Você está fora do horário de trabalho.
        </p>

        {/* Schedule info */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 backdrop-blur-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-indigo-300/70">
            Horário permitido
          </p>
          <p className="text-lg font-semibold text-white">
            {daysStr} &middot; {String(startHour).padStart(2, "0")}h às {String(endHour).padStart(2, "0")}h
          </p>
          <p className="mt-2 text-sm text-white/40">
            Você pode entrar{" "}
            <span className="font-medium text-white/70">{nextAllowed}</span>
          </p>
        </div>
      </div>

      {/* Bottom — logout */}
      <div className="relative z-10 w-full max-w-xs">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-white/10 px-6 py-3.5 text-sm font-semibold text-white/80 ring-1 ring-white/10 transition-all hover:bg-white/15 hover:text-white hover:ring-white/20 active:scale-[0.98]"
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
