"use client";

import { useEffect, useMemo, useState } from "react";
import type { TaskListItem } from "@/lib/task-fields";
import { Icon } from "./ui/Icon";

export function KanbanCommandPalette({
  open,
  tasks,
  onClose,
  onSelectTask,
  onNewTask,
}: {
  open: boolean;
  tasks: TaskListItem[];
  onClose: () => void;
  onSelectTask: (task: TaskListItem) => void;
  onNewTask: () => void;
}) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tasks.slice(0, 12);
    return tasks
      .filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.client?.name.toLowerCase().includes(q)
      )
      .slice(0, 12);
  }, [tasks, query]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 p-4 pt-[15vh]"
      onClick={onClose}
    >
      <div
        className="panel-solid w-full max-w-lg overflow-hidden shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Icon name="search" className="h-4 w-4 text-muted" />
          <input
            autoFocus
            className="flex-1 bg-transparent text-sm outline-none"
            placeholder="Buscar tarefas ou ações..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
            }}
          />
          <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[10px] text-muted sm:inline">
            Esc
          </kbd>
        </div>

        <ul className="max-h-72 overflow-y-auto py-2">
          <li>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-surface"
              onClick={() => {
                onNewTask();
                onClose();
              }}
            >
              <Icon name="plus" className="h-4 w-4 text-primary" />
              Nova tarefa
            </button>
          </li>
          {filtered.map((task) => (
            <li key={task.id}>
              <button
                type="button"
                className="flex w-full flex-col px-4 py-2 text-left hover:bg-surface"
                onClick={() => {
                  onSelectTask(task);
                  onClose();
                }}
              >
                <span className="text-sm font-medium">{task.title}</span>
                <span className="text-xs text-muted">
                  {task.column.name}
                  {task.assignee ? ` · ${task.assignee.name}` : ""}
                </span>
              </button>
            </li>
          ))}
          {filtered.length === 0 && query && (
            <li className="px-4 py-6 text-center text-sm text-muted">Nenhum resultado</li>
          )}
        </ul>
      </div>
    </div>
  );
}

export function useKanbanCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return { open, setOpen };
}
