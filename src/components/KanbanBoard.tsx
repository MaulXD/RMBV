"use client";

import { useState } from "react";
import Link from "next/link";
import type { KanbanColumnItem } from "@/lib/kanban-columns";
import type { TaskListItem } from "@/lib/task-fields";
import { PriorityBadge } from "./PriorityBadge";
import { TaskProgressBar } from "./TaskProgressBar";
import { Icon } from "./ui/Icon";

const COLUMN_PAGE_SIZE = 15;

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
  return "border-t-primary/40";
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
      className={`kanban-task-card ${dragging ? "scale-[0.98] opacity-40" : ""} ${
        task.overdue
          ? "border-red-500/50 bg-red-500/5"
          : task.dueSoon
            ? "border-amber-500/50 bg-amber-500/5"
            : ""
      }`}
    >
      <button type="button" className="w-full text-left" onClick={() => onEdit(task)}>
        <div className="mb-1 flex items-start justify-between gap-1.5">
          <p className="line-clamp-2 text-xs font-semibold leading-snug text-foreground">
            {task.title}
          </p>
          <PriorityBadge priority={task.priority} compact />
        </div>
        {task.labels.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
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
        {task.description && (
          <p className="mb-1.5 line-clamp-1 text-[10px] text-muted">{task.description}</p>
        )}
        <TaskProgressBar checklist={task.checklist} />
        {task.assignee && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted">
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
        {task.chamadoId && (
          <p className="mt-1 text-[10px] text-primary/80">Vinculado a chamado</p>
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

function ColumnBody({
  columnId,
  tasks,
  onEditTask,
  draggingId,
  setDraggingId,
}: {
  columnId: string;
  tasks: TaskListItem[];
  onEditTask: (task: TaskListItem) => void;
  draggingId: string | null;
  setDraggingId: (id: string | null) => void;
}) {
  const [visible, setVisible] = useState(COLUMN_PAGE_SIZE);
  const shown = tasks.slice(0, visible);
  const hasMore = tasks.length > visible;

  if (tasks.length === 0) {
    return (
      <div className="mx-2 my-2 flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border/50 py-8 text-muted/50">
        <Icon name="kanban" className="mb-1 h-6 w-6 opacity-30" />
        <span className="text-xs">Arraste tarefas aqui</span>
      </div>
    );
  }

  return (
    <>
      {shown.map((task) => (
        <KanbanCard
          key={task.id}
          task={task}
          onEdit={onEditTask}
          dragging={draggingId === task.id}
          onDragStart={() => setDraggingId(task.id)}
          onDragEnd={() => setDraggingId(null)}
        />
      ))}
      {hasMore && (
        <button
          type="button"
          className="mx-2 mb-2 w-[calc(100%-1rem)] rounded-lg border border-dashed border-border py-2 text-xs text-muted hover:border-primary/40 hover:text-primary"
          onClick={() => setVisible((v) => v + COLUMN_PAGE_SIZE)}
        >
          Carregar mais ({tasks.length - visible} restantes)
        </button>
      )}
    </>
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

        return (
          <section
            key={column.id}
            className={`kanban-column-shell ${topClass} ${
              isDrop ? "ring-2 ring-primary/25" : ""
            }`}
            style={
              column.color
                ? { borderTopColor: column.color, borderTopWidth: 4 }
                : undefined
            }
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
            <header className="flex items-center justify-between gap-2 border-b border-border/70 bg-surface/40 px-2.5 py-2">
              <div>
                <h3 className="text-[10px] font-bold tracking-widest text-muted uppercase">
                  {column.name}
                  {column.isDone && (
                    <span className="ml-1 font-normal normal-case text-emerald-600 dark:text-emerald-400">
                      · ok
                    </span>
                  )}
                </h3>
                <p className="text-[10px] text-muted">{tasks.length}</p>
              </div>
              <button
                type="button"
                className="btn-ghost px-1.5 py-1"
                title="Nova tarefa"
                onClick={() => onAddTask(column.id)}
              >
                <Icon name="plus" className="h-4 w-4" />
              </button>
            </header>

            <div className="flex flex-1 flex-col overflow-y-auto py-2">
              <ColumnBody
                columnId={column.id}
                tasks={tasks}
                onEditTask={onEditTask}
                draggingId={draggingId}
                setDraggingId={setDraggingId}
              />
            </div>
          </section>
        );
      })}
    </div>
  );
}
