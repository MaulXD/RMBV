"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "./ui/Icon";

type TodayData = {
  summary: {
    openChamados: number;
    chamadoSlaBreached: number;
    chamadoSlaSoon: number;
    tasksOverdue: number;
    tasksDueSoon: number;
    finalizationPending: number;
  };
  chamadoSlaBreached: { id: string; number: number; title: string }[];
  tasksOverdue: { id: string; title: string }[];
};

export function TeamTodayPanel() {
  const [data, setData] = useState<TodayData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/today")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null));
  }, []);

  if (!data?.summary) return null;

  const s = data.summary;
  const cards = [
    { label: "Chamados abertos", value: s.openChamados, href: "/chamados", tone: "text-foreground" },
    { label: "Chamados atrasados", value: s.chamadoSlaBreached, href: "/chamados", tone: "text-red-600 dark:text-red-400" },
    { label: "Tarefas atrasadas", value: s.tasksOverdue, href: "/kanban", tone: "text-red-600 dark:text-red-400" },
    { label: "Finalizações pendentes", value: s.finalizationPending, href: "/dashboard", tone: "text-amber-600 dark:text-amber-400" },
  ];

  return (
    <section className="soft-card mb-6 overflow-hidden">
      <header className="flex items-center justify-between border-b border-border/70 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Icon name="clock" className="h-4 w-4 text-primary" />
          Hoje na equipe
        </h2>
        <span className="text-[10px] text-muted">
          {s.tasksDueSoon + s.chamadoSlaSoon > 0
            ? `${s.tasksDueSoon + s.chamadoSlaSoon} vencendo em breve`
            : "Sem alertas próximos"}
        </span>
      </header>
      <div className="grid grid-cols-2 gap-px bg-border/50 md:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="flex flex-col bg-surface-elevated px-4 py-3 transition-colors hover:bg-surface"
          >
            <span className={`text-2xl font-bold ${c.tone}`}>{c.value}</span>
            <span className="text-[11px] text-muted">{c.label}</span>
          </Link>
        ))}
      </div>
      {(data.chamadoSlaBreached.length > 0 || data.tasksOverdue.length > 0) && (
        <div className="grid gap-3 border-t border-border/70 p-4 md:grid-cols-2">
          {data.chamadoSlaBreached.length > 0 && (
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase text-red-600 dark:text-red-400">Chamados atrasados</p>
              <ul className="space-y-1 text-xs">
                {data.chamadoSlaBreached.map((c) => (
                  <li key={c.id}>
                    <Link href={`/chamados/${c.id}`} className="text-primary hover:underline">
                      #{c.number} {c.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {data.tasksOverdue.length > 0 && (
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase text-red-600 dark:text-red-400">Tarefas atrasadas</p>
              <ul className="space-y-1 text-xs">
                {data.tasksOverdue.map((t) => (
                  <li key={t.id}>
                    <Link href="/kanban" className="text-primary hover:underline">
                      {t.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
