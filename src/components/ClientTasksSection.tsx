"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { KanbanTaskModal, type TaskFormValues } from "@/components/KanbanTaskModal";
import { Icon } from "@/components/ui/Icon";
import type { ClientProfileData } from "@/lib/client-fields";
import type { KanbanColumnItem } from "@/lib/kanban-columns";
import type { TaskListItem } from "@/lib/task-fields";

type Member = { id: string; name: string; role: string };

function dueAtToIso(date: string): string | null {
  if (!date) return null;
  return new Date(`${date}T12:00:00`).toISOString();
}

function formatDueDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function ClientTasksSection({ client }: { client: ClientProfileData }) {
  const [userTeamId, setUserTeamId] = useState<string | null>(null);
  const [columns, setColumns] = useState<KanbanColumnItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskListItem | null>(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  const teamId = client.teamId ?? userTeamId ?? "";
  const firstColumnId = columns[0]?.id ?? "";

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUserTeamId(d.user?.teamId ?? null));
  }, []);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks?clientId=${client.id}`);
      const data = await res.json();
      if (res.ok) {
        const list = (data.tasks ?? []) as TaskListItem[];
        list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        setTasks(list);
      }
    } finally {
      setLoading(false);
    }
  }, [client.id]);

  const loadBoardMeta = useCallback(async () => {
    if (!teamId) {
      setColumns([]);
      setMembers([]);
      return;
    }
    const [colRes, memRes] = await Promise.all([
      fetch(`/api/kanban/columns?teamId=${teamId}`),
      fetch(`/api/tasks/assignees?teamId=${teamId}`),
    ]);
    const colData = await colRes.json();
    const memData = await memRes.json();
    if (colRes.ok) setColumns(colData.columns ?? []);
    if (memRes.ok) setMembers(memData.members ?? []);
  }, [teamId]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    void loadBoardMeta();
  }, [loadBoardMeta]);

  async function saveTask(values: TaskFormValues) {
    if (!teamId) return;
    setSaving(true);
    try {
      const payload = {
        title: values.title,
        description: values.description || null,
        columnId: values.columnId,
        dueAt: dueAtToIso(values.dueAt),
        assigneeId: values.assigneeId || null,
        clientId: client.id,
        teamId,
      };

      const res = editingTask
        ? await fetch(`/api/tasks/${editingTask.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao salvar");

      if (editingTask) {
        setEditingTask(data.task);
        setHistoryRefreshKey((k) => k + 1);
      } else {
        setModalOpen(false);
        setEditingTask(null);
      }
      await loadTasks();
    } finally {
      setSaving(false);
    }
  }

  async function deleteTask() {
    if (!editingTask) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tasks/${editingTask.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Falha ao excluir");
      }
      setModalOpen(false);
      setEditingTask(null);
      await loadTasks();
    } finally {
      setSaving(false);
    }
  }

  const presetClient = {
    id: client.id,
    name: client.name,
    cod: client.cod,
  };

  return (
    <section className="industrial-panel p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold tracking-widest text-muted uppercase">Tarefas</h2>
          <p className="mt-1 text-sm text-muted">
            Tarefas do kanban vinculadas a este cliente.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/kanban" className="btn-ghost text-sm">
            Abrir kanban
          </Link>
          <button
            type="button"
            className="btn-primary"
            disabled={!teamId || !firstColumnId}
            onClick={() => {
              setEditingTask(null);
              setModalOpen(true);
            }}
          >
            <Icon name="plus" className="h-4 w-4" />
            Nova tarefa
          </button>
        </div>
      </div>

      {!teamId ? (
        <p className="text-sm text-muted">
          Este cliente não está vinculado a uma equipe. Não é possível criar tarefas.
        </p>
      ) : loading ? (
        <p className="text-sm text-muted">Carregando tarefas...</p>
      ) : tasks.length === 0 ? (
        <div className="rounded-[var(--radius-ui)] border border-dashed border-border px-4 py-8 text-center">
          <p className="text-sm text-muted">Nenhuma tarefa para este cliente.</p>
          <button
            type="button"
            className="btn-primary mt-4"
            disabled={!firstColumnId}
            onClick={() => {
              setEditingTask(null);
              setModalOpen(true);
            }}
          >
            Criar primeira tarefa
          </button>
        </div>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <li key={task.id}>
              <button
                type="button"
                className={`flex w-full flex-wrap items-center justify-between gap-3 rounded-[var(--radius-ui)] border px-4 py-3 text-left transition-colors hover:bg-surface-elevated/80 ${
                  task.overdue
                    ? "border-red-500/40 bg-red-500/5"
                    : task.dueSoon
                      ? "border-amber-500/40 bg-amber-500/5"
                      : "border-border/60 bg-surface/40"
                }`}
                onClick={() => {
                  setEditingTask(task);
                  setModalOpen(true);
                }}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{task.title}</p>
                  {task.description && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted">{task.description}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span
                    className="rounded-full border border-border px-2 py-0.5"
                    style={
                      task.column.color
                        ? { borderColor: task.column.color, color: task.column.color }
                        : undefined
                    }
                  >
                    {task.column.name}
                  </span>
                  {task.assignee && <span>{task.assignee.name}</span>}
                  {task.dueAt && (
                    <span
                      className={
                        task.overdue
                          ? "text-red-600 dark:text-red-400"
                          : task.dueSoon
                            ? "text-amber-700 dark:text-amber-400"
                            : ""
                      }
                    >
                      {formatDueDate(task.dueAt)}
                      {task.overdue ? " · atrasada" : task.dueSoon ? " · em breve" : ""}
                    </span>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <KanbanTaskModal
        open={modalOpen}
        task={editingTask}
        defaultColumnId={firstColumnId}
        columns={columns}
        teamId={teamId}
        teseId={client.teseId}
        members={members}
        saving={saving}
        presetClient={presetClient}
        lockClient
        historyRefreshKey={historyRefreshKey}
        onClose={() => {
          setModalOpen(false);
          setEditingTask(null);
        }}
        onSave={saveTask}
        onDelete={editingTask ? deleteTask : undefined}
      />
    </section>
  );
}
