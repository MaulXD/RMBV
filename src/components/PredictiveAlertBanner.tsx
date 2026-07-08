"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "./ui/Icon";

function getTomorrowDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function PredictiveAlertBanner() {
  const [count, setCount] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/tasks/alerts")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const tomorrow = getTomorrowDateString();
        const dueSoon: { dueAt: string | null }[] = d.dueSoon ?? [];
        const tomorrowCount = dueSoon.filter(
          (t) => t.dueAt && t.dueAt.slice(0, 10) === tomorrow,
        ).length;
        setCount(tomorrowCount);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready || count === 0) return null;

  return (
    <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-500/35 bg-amber-500/8 px-4 py-2.5 text-sm">
      <span
        className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-amber-500"
        aria-hidden
      />
      <span className="flex-1 text-amber-700 dark:text-amber-400">
        Você tem{" "}
        <strong>
          {count} {count === 1 ? "tarefa vencendo" : "tarefas vencendo"}
        </strong>{" "}
        amanhã
      </span>
      <Link
        href="/kanban"
        className="flex shrink-0 items-center gap-1 text-xs font-medium text-amber-700 hover:underline dark:text-amber-400"
      >
        Ver Kanban
        <Icon name="arrowRight" className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
