"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "./SessionProvider";
import { Icon } from "./ui/Icon";

/** Lembrete in-app para bater saída antes do fim do expediente. */
export function PontoExitReminder() {
  const { user } = useSession();
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user || user.role === "ADMIN") return;

    const check = async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const [schedRes, pontoRes] = await Promise.all([
          fetch("/api/equipe/team-schedule"),
          fetch(`/api/ponto?userId=${user.id}&date=${today}`),
        ]);
        const sched = await schedRes.json();
        const ponto = await pontoRes.json();
        if (!sched.scheduleEnabled) return;

        const now = new Date();
        const hour = now.getHours() + now.getMinutes() / 60;
        const endHour = sched.scheduleEnd ?? 19;
        const minutesToEnd = (endHour - hour) * 60;

        const records = (ponto.records ?? []) as { type: string }[];
        const last = records[records.length - 1];
        const needsExit =
          last &&
          (last.type === "ENTRADA" ||
            last.type === "INTERVALO_INICIO" ||
            last.type === "INTERVALO_FIM");

        if (needsExit && minutesToEnd > 0 && minutesToEnd <= 45) {
          setMessage(
            minutesToEnd <= 15
              ? "Faltam poucos minutos para o fim do expediente. Registre sua saída no ponto facial."
              : "Lembrete: registre intervalo ou saída no ponto facial antes de encerrar o dia.",
          );
          setShow(true);
        } else {
          setShow(false);
        }
      } catch {
        setShow(false);
      }
    };

    check();
    const id = setInterval(check, 5 * 60_000);
    return () => clearInterval(id);
  }, [user]);

  if (!show) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
        <Icon name="clock" className="h-4 w-4 shrink-0" />
        <span>{message}</span>
      </div>
      <Link href="/ponto" className="btn-primary shrink-0 text-xs">
        Ir ao ponto
      </Link>
    </div>
  );
}
