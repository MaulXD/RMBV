"use client";

import type { KanbanColumnItem } from "@/lib/kanban-columns";
import type { TaskListItem } from "@/lib/task-fields";
import { PRIORITY_LABELS } from "@/lib/enum-labels";
import { PriorityBadge } from "./PriorityBadge";
import { TaskProgressBar } from "./TaskProgressBar";
import { Icon } from "./ui/Icon";

function formatDueDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function KanbanListView({
  tasks,
  columns,
  onEditTask,
}: {
  tasks: TaskListItem[];
  columns: KanbanColumnItem[];
  onEditTask: (task: TaskListItem) => void;
}) {
  const columnMap = new Map(columns.map((c) => [c.id, c.name]));

  const sorted = [...tasks].sort((a, b) => {
    const prio = { ALTA: 0, MEDIA: 1, BAIXA: 2 };
    const pd = prio[a.priority] - prio[b.priority];
    if (pd !== 0) return pd;
    return a.title.localeCompare(b.title);
  });

  if (sorted.length === 0) {
    return (
      <div className="panel-solid p-8 text-center text-sm text-muted">Nenhuma tarefa encontrada.</div>
    );
  }

  return (
    <div className="panel-solid overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            <th className="px-4 py-3 font-medium">Tarefa</th>
            <th className="hidden px-4 py-3 font-medium md:table-cell">Coluna</th>
            <th className="px-4 py-3 font-medium">Prioridade</th>
            <th className="hidden px-4 py-3 font-medium lg:table-cell">Responsável</th>
            <th className="hidden px-4 py-3 font-medium sm:table-cell">Prazo</th>
            <th className="px-4 py-3 font-medium">Progresso</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((task) => (
            <tr
              key={task.id}
              className="cursor-pointer border-b border-border/50 hover:bg-surface/80"
              onClick={() => onEditTask(task)}
            >
              <td className="px-4 py-3">
                <p className="font-medium text-foreground">{task.title}</p>
                {task.labels.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {task.labels.map((l) => (
                      <span
                        key={l.id}
                        className="rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
                        style={{ backgroundColor: l.color }}
                      >
                        {l.name}
                      </span>
                    ))}
                  </div>
                )}
              </td>
              <td className="hidden px-4 py-3 text-muted md:table-cell">
                {columnMap.get(task.columnId) ?? "—"}
              </td>
              <td className="px-4 py-3">
                <PriorityBadge priority={task.priority} />
              </td>
              <td className="hidden px-4 py-3 text-muted lg:table-cell">
                {task.assignee?.name ?? "—"}
              </td>
              <td className="hidden px-4 py-3 sm:table-cell">
                {task.dueAt ? (
                  <span
                    className={
                      task.overdue
                        ? "text-red-600 dark:text-red-400"
                        : task.dueSoon
                          ? "text-amber-700 dark:text-amber-400"
                          : "text-muted"
                    }
                  >
                    {formatDueDate(task.dueAt)}
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3">
                {task.checklist.total > 0 ? (
                  <span className="text-xs text-muted">{task.checklist.percent}%</span>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
