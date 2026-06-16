"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { KanbanAlertsBanner } from "@/components/KanbanAlertsBanner";
import { KanbanBoard } from "@/components/KanbanBoard";
import { KanbanColumnManager } from "@/components/KanbanColumnManager";
import { KanbanTaskModal, type TaskFormValues } from "@/components/KanbanTaskModal";
import { useTeseFilter } from "@/components/TeseFilterProvider";
import type { KanbanColumnItem } from "@/lib/kanban-columns";
import { groupTasksByColumn } from "@/lib/task-query";
import type { TaskListItem } from "@/lib/task-fields";
import { Icon } from "@/components/ui/Icon";

type Team = { id: string; name: string };
type Member = { id: string; name: string; role: string };
type SlaFilter = "all" | "overdue" | "due_soon";

function dueAtToIso(date: string): string | null {
  if (!date) return null;
  return new Date(`${date}T12:00:00`).toISOString();
}

export default function KanbanPage() {
  return (
    <AppShell>
      <KanbanContent />
    </AppShell>
  );
}

function KanbanContent() {
  const { activeTeseId, activeTese } = useTeseFilter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState<string>("");
  const [members, setMembers] = useState<Member[]>([]);
  const [columns, setColumns] = useState<KanbanColumnItem[]>([]);
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [slaFilter, setSlaFilter] = useState<SlaFilter>("all");
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [alertOverdue, setAlertOverdue] = useState<TaskListItem[]>([]);
  const [alertDueSoon, setAlertDueSoon] = useState<TaskListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [showColumns, setShowColumns] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskListItem | null>(null);
  const [defaultColumnId, setDefaultColumnId] = useState("");
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  const canManageColumns =
    userRole === "ADMIN" || userRole === "ADV" || userRole === "GERENTE";

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setUserRole(d.user?.role ?? null);
        const admin = d.user?.role === "ADMIN";
        setIsAdmin(admin);
        if (!admin && d.user?.teamId) {
          setTeamId(d.user.teamId);
        }
      });
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/teams")
      .then((r) => r.json())
      .then((d) => {
        const list = (d.teams ?? []) as Team[];
        setTeams(list);
        if (list[0] && !teamId) setTeamId(list[0].id);
      });
  }, [isAdmin, teamId]);

  const loadColumns = useCallback(async () => {
    if (!teamId) {
      setColumns([]);
      return;
    }
    const res = await fetch(`/api/kanban/columns?teamId=${teamId}`);
    const data = await res.json();
    if (res.ok) setColumns(data.columns ?? []);
  }, [teamId]);

  const loadMembers = useCallback(async () => {
    if (!teamId) return;
    const res = await fetch(`/api/tasks/assignees?teamId=${teamId}`);
    const data = await res.json();
    if (res.ok) setMembers(data.members ?? []);
  }, [teamId]);

  const loadAlerts = useCallback(async () => {
    if (!teamId) {
      setAlertOverdue([]);
      setAlertDueSoon([]);
      return;
    }
    const params = new URLSearchParams({ teamId });
    if (activeTeseId) params.set("teseId", activeTeseId);
    if (assigneeFilter) params.set("assigneeId", assigneeFilter);
    const res = await fetch(`/api/tasks/alerts?${params}`);
    const data = await res.json();
    if (res.ok) {
      setAlertOverdue(data.overdue ?? []);
      setAlertDueSoon(data.dueSoon ?? []);
    }
  }, [teamId, activeTeseId, assigneeFilter]);

  const loadTasks = useCallback(async () => {
    if (!teamId) {
      setTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ teamId });
      if (activeTeseId) params.set("teseId", activeTeseId);
      if (assigneeFilter) params.set("assigneeId", assigneeFilter);
      const res = await fetch(`/api/tasks?${params}`);
      const data = await res.json();
      if (res.ok) setTasks(data.tasks ?? []);
    } finally {
      setLoading(false);
    }
  }, [teamId, activeTeseId, assigneeFilter]);

  const refreshBoard = useCallback(async () => {
    await Promise.all([loadColumns(), loadTasks(), loadAlerts()]);
  }, [loadColumns, loadTasks, loadAlerts]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    void loadColumns();
  }, [loadColumns]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  async function moveTask(taskId: string, columnId: string) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.columnId === columnId) return;

    const targetColumn = columns.find((c) => c.id === columnId);
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              columnId,
              overdue: targetColumn?.isDone ? false : t.overdue,
              dueSoon: targetColumn?.isDone ? false : t.dueSoon,
            }
          : t
      )
    );

    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columnId }),
    });
    if (!res.ok) void loadTasks();
    else {
      const data = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === taskId ? data.task : t)));
      void loadAlerts();
    }
  }

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
        clientId: values.clientId || null,
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
      await loadAlerts();
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
      await loadAlerts();
    } finally {
      setSaving(false);
    }
  }

  const filteredTasks =
    slaFilter === "overdue"
      ? tasks.filter((t) => t.overdue)
      : slaFilter === "due_soon"
        ? tasks.filter((t) => t.dueSoon)
        : tasks;

  const tasksByColumn = groupTasksByColumn(columns, filteredTasks);
  const firstColumnId = columns[0]?.id ?? "";

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-wide">Kanban de tarefas</h1>
          <p className="mt-1 text-sm text-muted">
            {activeTese
              ? `Filtrado pela tese: ${activeTese.name}`
              : "Todas as teses — use o seletor acima para filtrar"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManageColumns && teamId && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setShowColumns((v) => !v)}
            >
              Colunas
            </button>
          )}
          <button
            type="button"
            className="btn-primary"
            disabled={!teamId || !firstColumnId}
            onClick={() => {
              setEditingTask(null);
              setDefaultColumnId(firstColumnId);
              setModalOpen(true);
            }}
          >
            <Icon name="plus" className="h-4 w-4" />
            Nova tarefa
          </button>
        </div>
      </div>

      <section className="panel-solid mb-4 flex flex-wrap items-end gap-3 p-4">
        {isAdmin && (
          <div className="min-w-[200px] flex-1 sm:flex-none">
            <label className="mb-1 block text-xs text-muted">Equipe</label>
            <select
              className="industrial-input w-full"
              value={teamId}
              onChange={(e) => {
                setTeamId(e.target.value);
                setAssigneeFilter("");
              }}
            >
              <option value="">Selecione...</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="min-w-[200px] flex-1 sm:flex-none">
          <label className="mb-1 block text-xs text-muted">Responsável</label>
          <select
            className="industrial-input w-full"
            value={assigneeFilter}
            disabled={!teamId}
            onChange={(e) => setAssigneeFilter(e.target.value)}
          >
            <option value="">Todos</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-[200px] flex-1 sm:flex-none">
          <label className="mb-1 block text-xs text-muted">Prazo</label>
          <select
            className="industrial-input w-full"
            value={slaFilter}
            disabled={!teamId}
            onChange={(e) => setSlaFilter(e.target.value as SlaFilter)}
          >
            <option value="all">Todas</option>
            <option value="overdue">Só atrasadas</option>
            <option value="due_soon">Vencem em breve</option>
          </select>
        </div>

        <button
          type="button"
          className="btn-ghost"
          disabled={!teamId || loading}
          onClick={() => void refreshBoard()}
        >
          Atualizar
        </button>
      </section>

      {showColumns && teamId && (
        <div className="mb-4">
          <KanbanColumnManager
            teamId={teamId}
            columns={columns}
            canManage={canManageColumns}
            onUpdated={refreshBoard}
          />
        </div>
      )}

      {teamId && (alertOverdue.length > 0 || alertDueSoon.length > 0) && (
        <KanbanAlertsBanner
          overdue={alertOverdue}
          dueSoon={alertDueSoon}
          onOpenTask={(task) => {
            setEditingTask(task);
            setModalOpen(true);
          }}
        />
      )}

      {!teamId ? (
        <div className="panel-solid p-8 text-center text-sm text-muted">
          {isAdmin ? "Selecione uma equipe para ver o kanban." : "Você não está vinculado a uma equipe."}
        </div>
      ) : loading ? (
        <div className="panel-solid p-8 text-center text-sm text-muted">Carregando tarefas...</div>
      ) : columns.length === 0 ? (
        <div className="panel-solid p-8 text-center text-sm text-muted">Nenhuma coluna configurada.</div>
      ) : (
        <KanbanBoard
          columns={columns}
          tasksByColumn={tasksByColumn}
          onMoveTask={(id, columnId) => void moveTask(id, columnId)}
          onEditTask={(task) => {
            setEditingTask(task);
            setModalOpen(true);
          }}
          onAddTask={(columnId) => {
            setEditingTask(null);
            setDefaultColumnId(columnId);
            setModalOpen(true);
          }}
        />
      )}

      <KanbanTaskModal
        open={modalOpen}
        task={editingTask}
        defaultColumnId={defaultColumnId || firstColumnId}
        columns={columns}
        teamId={teamId}
        teseId={activeTeseId}
        members={members}
        saving={saving}
        onClose={() => {
          setModalOpen(false);
          setEditingTask(null);
        }}
        onSave={saveTask}
        onDelete={editingTask ? deleteTask : undefined}
        historyRefreshKey={historyRefreshKey}
      />
    </>
  );
}
