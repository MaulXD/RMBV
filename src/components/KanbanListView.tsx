"use client";

import type { KanbanColumnItem } from "@/lib/kanban-columns";
import type { TaskListItem } from "@/lib/task-fields";
import { PriorityBadge } from "./PriorityBadge";
import { TaskProgressBar } from "./TaskProgressBar";

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
      <div className="soft-card p-8 text-center text-sm text-muted">Nenhuma tarefa encontrada.</div>
    );
  }

  return (
    <div className="soft-card overflow-hidden">
      <table className="data-table">
        <thead>
          <tr>
            <th>Tarefa</th>
            <th className="hidden md:table-cell">Coluna</th>
            <th>Prioridade</th>
            <th className="hidden lg:table-cell">Responsável</th>
            <th className="hidden sm:table-cell">Prazo</th>
            <th>Progresso</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((task) => (
            <tr key={task.id} onClick={() => onEditTask(task)}>
              <td>
                <p className="font-medium">{task.title}</p>
                {task.labels.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {task.labels.map((l) => (
                      <span
                        key={l.id}
                        className="rounded px-1.5 py-0.5 text-[9px] font-medium text-white"
                        style={{ backgroundColor: l.color }}
                      >
                        {l.name}
                      </span>
                    ))}
                  </div>
                )}
              </td>
              <td className="hidden text-muted md:table-cell">
                {columnMap.get(task.columnId) ?? "—"}
              </td>
              <td>
                <PriorityBadge priority={task.priority} />
              </td>
              <td className="hidden text-muted lg:table-cell">{task.assignee?.name ?? "—"}</td>
              <td className="hidden sm:table-cell">
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
              <td>
                {task.checklist.total > 0 ? (
                  <div className="min-w-[72px]">
                    <TaskProgressBar checklist={task.checklist} showLabel={false} />
                    <span className="text-[10px] text-muted">{task.checklist.percent}%</span>
                  </div>
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
