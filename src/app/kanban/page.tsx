"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useSession } from "@/components/SessionProvider";
import { KanbanAlertsBanner } from "@/components/KanbanAlertsBanner";
import { KanbanBoard } from "@/components/KanbanBoard";
import { KanbanColumnManager } from "@/components/KanbanColumnManager";
import { KanbanCommandPalette, useKanbanCommandPalette } from "@/components/KanbanCommandPalette";
import { KanbanListView } from "@/components/KanbanListView";
import { KanbanTaskModal, type TaskFormValues } from "@/components/KanbanTaskModal";
import { PageHeader } from "@/components/PageHeader";
import { TeseFilterBar } from "@/components/TeseFilterBar";
import { useTeseFilter } from "@/components/TeseFilterProvider";
import type { KanbanColumnItem } from "@/lib/kanban-columns";
import { groupTasksByColumn } from "@/lib/task-query";
import type { TaskLabelItem, TaskListItem } from "@/lib/task-fields";
import { Icon } from "@/components/ui/Icon";

type Team = { id: string; name: string };
type Member = { id: string; name: string; role: string };
type SlaFilter = "all" | "overdue" | "due_soon";
type ViewMode = "board" | "list";

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
  const { user } = useSession();
  const userRole = user?.role ?? null;
  const isAdmin = user?.role === "ADMIN";
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState<string>(() => (!isAdmin ? (user?.teamId ?? "") : ""));
  const [members, setMembers] = useState<Member[]>([]);
  const [columns, setColumns] = useState<KanbanColumnItem[]>([]);
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [labelFilter, setLabelFilter] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("board");
  const [teamLabels, setTeamLabels] = useState<TaskLabelItem[]>([]);
  const [slaFilter, setSlaFilter] = useState<SlaFilter>("all");
  const { open: paletteOpen, setOpen: setPaletteOpen } = useKanbanCommandPalette();
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
    if (!isAdmin && user?.teamId && !teamId) setTeamId(user.teamId);
  }, [user, isAdmin, teamId]);

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
    const labelsRes = await fetch(`/api/task-labels?teamId=${teamId}`);
    const labelsData = await labelsRes.json();
    if (labelsRes.ok) setTeamLabels(labelsData.labels ?? []);
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
      if (priorityFilter !== "all") params.set("priority", priorityFilter);
      if (labelFilter) params.set("labelId", labelFilter);
      if (mineOnly) params.set("mineOnly", "1");
      const res = await fetch(`/api/tasks?${params}`);
      const data = await res.json();
      if (res.ok) setTasks(data.tasks ?? []);
    } finally {
      setLoading(false);
    }
  }, [teamId, activeTeseId, assigneeFilter, priorityFilter, labelFilter, mineOnly]);

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
        priority: values.priority,
        columnId: values.columnId,
        dueAt: dueAtToIso(values.dueAt),
        assigneeId: values.assigneeId || null,
        clientId: values.clientId || null,
        labelIds: values.labelIds,
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
      <PageHeader
        icon="kanban"
        title="Kanban de tarefas"
        subtitle="Arraste cards, use checklist na descrição e Ctrl+K para buscar"
        actions={
          <>
            <TeseFilterBar embedded />
            <button
              type="button"
              className="btn-ghost hidden sm:inline-flex"
              title="Busca rápida (Ctrl+K)"
              onClick={() => setPaletteOpen(true)}
            >
              <Icon name="search" className="h-4 w-4" />
              <span className="ml-1 hidden lg:inline">Ctrl+K</span>
            </button>
            <div className="flex overflow-hidden rounded-xl border border-border">
              <button
                type="button"
                className={`px-2.5 py-1.5 text-sm transition-colors ${viewMode === "board" ? "bg-primary/12 text-primary" : "text-muted hover:text-foreground"}`}
                onClick={() => setViewMode("board")}
                title="Quadro"
              >
                <Icon name="kanban" className="h-4 w-4" />
              </button>
              <button
                type="button"
                className={`border-l border-border px-2.5 py-1.5 text-sm transition-colors ${viewMode === "list" ? "bg-primary/12 text-primary" : "text-muted hover:text-foreground"}`}
                onClick={() => setViewMode("list")}
                title="Lista"
              >
                <Icon name="list" className="h-4 w-4" />
              </button>
            </div>
            {canManageColumns && teamId && (
              <button type="button" className="btn-ghost" onClick={() => setShowColumns((v) => !v)}>
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
          </>
        }
      />

      <section className="filter-bar">
        {isAdmin && (
          <div className="min-w-[140px]">
            <label className="text-muted">Equipe</label>
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

        <div className="min-w-[130px]">
          <label className="text-muted">Responsável</label>
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

        <div className="min-w-[110px]">
          <label className="text-muted">Prioridade</label>
          <select
            className="industrial-input w-full"
            value={priorityFilter}
            disabled={!teamId}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="all">Todas</option>
            <option value="ALTA">Alta</option>
            <option value="MEDIA">Média</option>
            <option value="BAIXA">Baixa</option>
          </select>
        </div>

        {teamLabels.length > 0 && (
          <div className="min-w-[110px]">
            <label className="text-muted">Etiqueta</label>
            <select
              className="industrial-input w-full"
              value={labelFilter}
              disabled={!teamId}
              onChange={(e) => setLabelFilter(e.target.value)}
            >
              <option value="">Todas</option>
              {teamLabels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <label className="flex items-center gap-1.5 pb-1.5 text-[11px] text-muted">
          <input
            type="checkbox"
            checked={mineOnly}
            disabled={!teamId}
            onChange={(e) => setMineOnly(e.target.checked)}
          />
          Minhas tarefas
        </label>

        <div className="min-w-[120px]">
          <label className="text-muted">Prazo</label>
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
      ) : viewMode === "list" ? (
        <KanbanListView
          tasks={filteredTasks}
          columns={columns}
          onEditTask={(task) => {
            setEditingTask(task);
            setModalOpen(true);
          }}
        />
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

      <KanbanCommandPalette
        open={paletteOpen}
        tasks={tasks}
        onClose={() => setPaletteOpen(false)}
        onSelectTask={(task) => {
          setEditingTask(task);
          setModalOpen(true);
        }}
        onNewTask={() => {
          setEditingTask(null);
          setDefaultColumnId(firstColumnId);
          setModalOpen(true);
        }}
      />

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
