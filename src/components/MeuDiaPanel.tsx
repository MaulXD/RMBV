"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "./ui/Icon";
import type { TaskListItem } from "@/lib/task-fields";

type FollowUp = {
  id: string;
  name: string;
  cod: string | null;
  followUpAt: string | null;
  status: string;
};

type MeuDiaData = {
  overdue: TaskListItem[];
  dueSoon: TaskListItem[];
  followUps: FollowUp[];
  counts: { overdue: number; dueSoon: number; followUps: number };
};

function readLocalBool(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return raw === "true";
  } catch {
    return fallback;
  }
}

function writeLocal(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isTomorrow(iso: string): boolean {
  const d = new Date(iso);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return (
    d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getDate() === tomorrow.getDate()
  );
}

export function MeuDiaPanel() {
  const [data, setData] = useState<MeuDiaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCollapsed(readLocalBool("meu-dia-collapsed", false));
    setHydrated(true);
  }, []);

  useEffect(() => {
    fetch("/api/me/dia")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    writeLocal("meu-dia-collapsed", String(next));
  }

  if (loading || !hydrated) return null;
  if (!data) return null;

  const { overdue, dueSoon, followUps, counts } = data;
  const hasAnything = counts.overdue > 0 || counts.dueSoon > 0 || counts.followUps > 0;
  if (!hasAnything) return null;

  return (
    <section className="soft-card mb-4 overflow-hidden">
      <button
        type="button"
        onClick={toggleCollapsed}
        className="flex w-full items-center justify-between border-b border-border/70 px-4 py-3 text-left transition-colors hover:bg-muted/5"
        aria-expanded={!collapsed}
      >
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Icon name="clock" className="h-4 w-4 text-primary" />
          Meu dia
        </h2>
        <div className="flex items-center gap-3">
          {collapsed && (
            <span className="flex items-center gap-2 text-[11px]">
              {counts.overdue > 0 && (
                <span className="rounded-full bg-red-500/15 px-2 py-0.5 font-semibold text-red-600 dark:text-red-400">
                  {counts.overdue}{" "}
                  {counts.overdue === 1 ? "tarefa atrasada" : "tarefas atrasadas"}
                </span>
              )}
              {counts.followUps > 0 && (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-semibold text-amber-700 dark:text-amber-400">
                  {counts.followUps}{" "}
                  {counts.followUps === 1 ? "retorno hoje" : "retornos hoje"}
                </span>
              )}
            </span>
          )}
          <Icon
            name={collapsed ? "chevronRight" : "chevronDown"}
            className="h-4 w-4 text-muted"
          />
        </div>
      </button>

      {!collapsed && (
        <div className="grid md:grid-cols-3">
          {/* Tarefas em atraso */}
          <div className="border-b border-border/60 p-4 md:border-b-0 md:border-r">
            <div className="mb-3 flex items-center gap-2">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-red-600 dark:text-red-400">
                Tarefas em atraso
              </h3>
              {counts.overdue > 0 && (
                <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                  {counts.overdue}
                </span>
              )}
            </div>
            {overdue.length === 0 ? (
              <p className="text-xs text-muted">Nenhuma tarefa em atraso.</p>
            ) : (
              <ul className="space-y-2.5">
                {overdue.slice(0, 8).map((task) => (
                  <li key={task.id} className="text-xs leading-snug">
                    <Link
                      href="/kanban"
                      className="font-medium text-primary hover:underline"
                    >
                      {task.title}
                    </Link>
                    {task.client && (
                      <Link
                        href={`/clients/${task.client.id}`}
                        className="ml-1 text-muted hover:text-foreground"
                      >
                        — {task.client.name}
                      </Link>
                    )}
                    {task.dueAt && (
                      <span className="ml-1 text-red-600 dark:text-red-400">
                        ({formatDate(task.dueAt)})
                      </span>
                    )}
                  </li>
                ))}
                {overdue.length > 8 && (
                  <li className="text-[10px] text-muted">
                    + {overdue.length - 8} outras tarefas
                  </li>
                )}
              </ul>
            )}
          </div>

          {/* Vence em breve */}
          <div className="border-b border-border/60 p-4 md:border-b-0 md:border-r">
            <div className="mb-3 flex items-center gap-2">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">
                Vence em breve
              </h3>
              {counts.dueSoon > 0 && (
                <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
                  {counts.dueSoon}
                </span>
              )}
            </div>
            {dueSoon.length === 0 ? (
              <p className="text-xs text-muted">Nenhuma tarefa vencendo em breve.</p>
            ) : (
              <ul className="space-y-2.5">
                {dueSoon.slice(0, 8).map((task) => (
                  <li key={task.id} className="text-xs leading-snug">
                    <Link
                      href="/kanban"
                      className="font-medium text-primary hover:underline"
                    >
                      {task.title}
                    </Link>
                    {task.client && (
                      <Link
                        href={`/clients/${task.client.id}`}
                        className="ml-1 text-muted hover:text-foreground"
                      >
                        — {task.client.name}
                      </Link>
                    )}
                    {task.dueAt && (
                      <span
                        className={`ml-1 ${
                          isTomorrow(task.dueAt)
                            ? "font-semibold text-amber-600 dark:text-amber-400"
                            : "text-muted"
                        }`}
                      >
                        {isTomorrow(task.dueAt)
                          ? "vence AMANHA"
                          : formatDate(task.dueAt)}
                      </span>
                    )}
                  </li>
                ))}
                {dueSoon.length > 8 && (
                  <li className="text-[10px] text-muted">
                    + {dueSoon.length - 8} outras tarefas
                  </li>
                )}
              </ul>
            )}
          </div>

          {/* Retornos de hoje */}
          <div className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-primary">
                Retornos de hoje
              </h3>
              {counts.followUps > 0 && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">
                  {counts.followUps}
                </span>
              )}
            </div>
            {followUps.length === 0 ? (
              <p className="text-xs text-muted">Nenhum retorno para hoje.</p>
            ) : (
              <ul className="space-y-2.5">
                {followUps.slice(0, 8).map((client) => (
                  <li key={client.id} className="text-xs leading-snug">
                    <Link
                      href={`/clients/${client.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {client.name}
                    </Link>
                    {client.cod && (
                      <span className="ml-1 text-muted">({client.cod})</span>
                    )}
                    {client.followUpAt && (
                      <span className="ml-1 text-muted">
                        — {formatDate(client.followUpAt)}
                      </span>
                    )}
                  </li>
                ))}
                {followUps.length > 8 && (
                  <li className="text-[10px] text-muted">
                    + {followUps.length - 8} outros clientes
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
