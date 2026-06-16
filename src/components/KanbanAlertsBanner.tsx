"use client";

import type { TaskListItem } from "@/lib/task-fields";
import { daysOverdue, daysUntilDue } from "@/lib/task-sla";
import { Icon } from "./ui/Icon";

function formatDueDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function KanbanAlertsBanner({
  overdue,
  dueSoon,
  onOpenTask,
}: {
  overdue: TaskListItem[];
  dueSoon: TaskListItem[];
  onOpenTask: (task: TaskListItem) => void;
}) {
  if (overdue.length === 0 && dueSoon.length === 0) return null;

  return (
    <section className="mb-4 space-y-3">
      {overdue.length > 0 && (
        <div className="rounded-[var(--radius-ui)] border border-red-500/40 bg-red-500/10 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Icon name="alert" className="h-4 w-4 text-red-600 dark:text-red-400" />
            <h2 className="text-sm font-semibold text-red-800 dark:text-red-300">
              {overdue.length} tarefa(s) com prazo vencido
            </h2>
          </div>
          <ul className="space-y-2">
            {overdue.map((task) => (
              <li key={task.id}>
                <button
                  type="button"
                  className="flex w-full flex-wrap items-center justify-between gap-2 rounded-[var(--radius-ui)] border border-red-500/30 bg-surface/80 px-3 py-2 text-left text-sm transition-colors hover:bg-red-500/10"
                  onClick={() => onOpenTask(task)}
                >
                  <span className="font-medium">{task.title}</span>
                  <span className="text-xs text-red-700 dark:text-red-300">
                    {task.dueAt && formatDueDate(task.dueAt)} · {daysOverdue(task)} dia(s) atrasado
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {dueSoon.length > 0 && (
        <div className="rounded-[var(--radius-ui)] border border-amber-500/40 bg-amber-500/10 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Icon name="alert" className="h-4 w-4 text-amber-700 dark:text-amber-400" />
            <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              {dueSoon.length} tarefa(s) vencem em breve
            </h2>
          </div>
          <ul className="space-y-2">
            {dueSoon.map((task) => (
              <li key={task.id}>
                <button
                  type="button"
                  className="flex w-full flex-wrap items-center justify-between gap-2 rounded-[var(--radius-ui)] border border-amber-500/30 bg-surface/80 px-3 py-2 text-left text-sm transition-colors hover:bg-amber-500/10"
                  onClick={() => onOpenTask(task)}
                >
                  <span className="font-medium">{task.title}</span>
                  <span className="text-xs text-amber-800 dark:text-amber-300">
                    {task.dueAt && formatDueDate(task.dueAt)}
                    {daysUntilDue(task) === 0
                      ? " · vence hoje"
                      : daysUntilDue(task) != null
                        ? ` · em ${daysUntilDue(task)} dia(s)`
                        : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
