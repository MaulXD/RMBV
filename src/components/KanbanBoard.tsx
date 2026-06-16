"use client";

import { useState } from "react";
import Link from "next/link";
import type { KanbanColumnItem } from "@/lib/kanban-columns";
import type { TaskListItem } from "@/lib/task-fields";
import { Icon } from "./ui/Icon";

function formatDueDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

function normalizeColumnName(name: string) {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function columnTopBorderClass(column: KanbanColumnItem): string {
  if (column.color) return "";
  if (column.isDone) return "border-t-emerald-500";
  const n = normalizeColumnName(column.name);
  if (n.includes("fazer") || n === "todo") return "border-t-slate-500";
  if (n.includes("andamento") || n.includes("progress")) return "border-t-cyan-500";
  if (n.includes("aguardando") || n.includes("waiting")) return "border-t-amber-500";
  if (n.includes("conclu") || n.includes("finaliz")) return "border-t-emerald-500";
  return "border-t-border";
}

function KanbanCard({
  task,
  onEdit,
  dragging,
  onDragStart,
  onDragEnd,
}: {
  task: TaskListItem;
  onEdit: (task: TaskListItem) => void;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const assigneeInitial = task.assignee?.name?.[0]?.toUpperCase() ?? "";

  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/task-id", task.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={`group mx-2 mb-2 cursor-grab rounded-xl border border-border bg-surface p-3 transition-colors active:cursor-grabbing hover:border-primary/40 ${
        dragging ? "opacity-40" : ""
      } ${
        task.overdue
          ? "border-red-500/50 bg-red-500/5"
          : task.dueSoon
            ? "border-amber-500/50 bg-amber-500/5"
            : ""
      }`}
    >
      <button type="button" className="w-full text-left" onClick={() => onEdit(task)}>
        <p className="mb-2 text-sm font-medium text-foreground">{task.title}</p>
        {task.description && (
          <p className="mb-2 line-clamp-2 text-xs text-muted">{task.description}</p>
        )}
        {task.assignee && (
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
              {assigneeInitial}
            </div>
            {task.assignee.name}
          </div>
        )}
        {task.client && (
          <p className="mt-1.5 text-xs text-muted">
            Cliente:{" "}
            <Link
              href={`/clients/${task.client.id}`}
              className="text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {task.client.name}
            </Link>
          </p>
        )}
        {task.dueAt && (
          <span
            className={`mt-1 block text-[11px] ${
              task.overdue
                ? "text-red-600 dark:text-red-400"
                : task.dueSoon
                  ? "text-amber-700 dark:text-amber-400"
                  : "text-muted"
            }`}
          >
            {formatDueDate(task.dueAt)}
            {task.overdue ? " · atrasado" : task.dueSoon ? " · em breve" : ""}
          </span>
        )}
      </button>
    </article>
  );
}

export function KanbanBoard({
  columns,
  tasksByColumn,
  onMoveTask,
  onEditTask,
  onAddTask,
}: {
  columns: KanbanColumnItem[];
  tasksByColumn: Record<string, TaskListItem[]>;
  onMoveTask: (taskId: string, columnId: string) => void;
  onEditTask: (task: TaskListItem) => void;
  onAddTask: (columnId: string) => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  return (
    <div className="scrollbar-none -mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
      {columns.map((column) => {
        const tasks = tasksByColumn[column.id] ?? [];
        const isDrop = dropTarget === column.id;
        const topClass = columnTopBorderClass(column);
        const borderStyle = column.color
          ? { borderTopColor: column.color, borderTopWidth: 3 }
          : undefined;

        return (
          <section
            key={column.id}
            className={`industrial-panel flex min-h-[320px] w-[min(100%,280px)] shrink-0 flex-col overflow-hidden border-t-2 p-0 ${
              topClass
            } ${isDrop ? "border-primary ring-2 ring-primary/20" : ""}`}
            style={borderStyle}
            onDragOver={(e) => {
              e.preventDefault();
              setDropTarget(column.id);
            }}
            onDragLeave={() => setDropTarget((prev) => (prev === column.id ? null : prev))}
            onDrop={(e) => {
              e.preventDefault();
              setDropTarget(null);
              const taskId = e.dataTransfer.getData("text/task-id");
              if (taskId) onMoveTask(taskId, column.id);
              setDraggingId(null);
            }}
          >
            <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-3">
              <div>
                <h3 className="text-xs font-bold tracking-widest text-muted uppercase">
                  {column.name}
                  {column.isDone && (
                    <span className="ml-1.5 font-normal normal-case text-primary">· final</span>
                  )}
                </h3>
                <p className="text-xs text-muted">{tasks.length} tarefa(s)</p>
              </div>
              <button
                type="button"
                className="btn-ghost px-2 py-1"
                title="Nova tarefa"
                onClick={() => onAddTask(column.id)}
              >
                <Icon name="plus" className="h-4 w-4" />
              </button>
            </header>

            <div className="flex flex-1 flex-col overflow-y-auto py-2">
              {tasks.length === 0 ? (
                <div className="mx-2 my-2 flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border/50 py-8 text-muted/50">
                  <Icon name="kanban" className="mb-1 h-6 w-6 opacity-30" />
                  <span className="text-xs">Arraste tarefas aqui</span>
                </div>
              ) : (
                tasks.map((task) => (
                  <KanbanCard
                    key={task.id}
                    task={task}
                    onEdit={onEditTask}
                    dragging={draggingId === task.id}
                    onDragStart={() => setDraggingId(task.id)}
                    onDragEnd={() => setDraggingId(null)}
                  />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
