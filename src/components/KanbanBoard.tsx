"use client";

import { useState } from "react";
import Link from "next/link";
import type { KanbanColumnItem } from "@/lib/kanban-columns";
import type { TaskListItem } from "@/lib/task-fields";
import { Icon } from "./ui/Icon";

function formatDueDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
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
  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/task-id", task.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={`field-card cursor-grab active:cursor-grabbing ${
        dragging ? "opacity-40" : ""
      } ${task.overdue ? "border-red-500/50 bg-red-500/5" : ""}`}
    >
      <button type="button" className="w-full text-left" onClick={() => onEdit(task)}>
        <h4 className="text-sm font-medium leading-snug">{task.title}</h4>
        {task.description && (
          <p className="mt-1 line-clamp-2 text-xs text-muted">{task.description}</p>
        )}
        <div className="mt-3 space-y-1.5 text-xs text-muted">
          {task.client && (
            <p>
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
          {task.assignee && <p>Responsável: {task.assignee.name}</p>}
          {task.dueAt && (
            <p className={task.overdue ? "font-medium text-red-600 dark:text-red-400" : ""}>
              Prazo: {formatDueDate(task.dueAt)}
              {task.overdue ? " (atrasado)" : ""}
            </p>
          )}
        </div>
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
    <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
      {columns.map((column) => {
        const tasks = tasksByColumn[column.id] ?? [];
        const isDrop = dropTarget === column.id;
        const borderStyle = column.color ? { borderTopColor: column.color, borderTopWidth: 3 } : {};

        return (
          <section
            key={column.id}
            className={`flex min-h-[320px] w-[min(100%,280px)] shrink-0 flex-col rounded-[var(--radius-ui)] border bg-surface/40 ${
              isDrop ? "border-primary ring-2 ring-primary/20" : "border-border"
            }`}
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
            <header className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-3">
              <div>
                <h3 className="text-xs font-semibold tracking-widest text-muted uppercase">
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

            <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
              {tasks.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted">Arraste tarefas aqui</p>
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
