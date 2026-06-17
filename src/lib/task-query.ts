import type { Task, TaskPriority } from "@prisma/client";
import type { KanbanColumnItem } from "./kanban-columns";
import { formatKanbanColumn } from "./kanban-columns";
import { enrichTaskSla } from "./task-sla";
import { parseChecklistProgress } from "./task-checklist";
import type { TaskListItem } from "./task-fields";

export const taskListInclude = {
  column: true,
  assignee: { select: { id: true, name: true } },
  client: { select: { id: true, name: true, cod: true, teseId: true } },
  createdBy: { select: { id: true, name: true } },
  labels: {
    include: {
      label: { select: { id: true, name: true, color: true } },
    },
  },
} as const;

type TaskWithRelations = Task & {
  column: Parameters<typeof formatKanbanColumn>[0];
  assignee: { id: string; name: string } | null;
  client: { id: string; name: string; cod: string | null; teseId: string | null } | null;
  createdBy: { id: string; name: string };
  labels: { label: { id: string; name: string; color: string } }[];
};

export function formatTaskForApi(task: TaskWithRelations): TaskListItem {
  const column = formatKanbanColumn(task.column);
  const checklist = parseChecklistProgress(task.description);

  return enrichTaskSla({
    id: task.id,
    title: task.title,
    description: task.description,
    priority: task.priority,
    columnId: task.columnId,
    dueAt: task.dueAt?.toISOString() ?? null,
    sortOrder: task.sortOrder,
    teamId: task.teamId,
    clientId: task.clientId,
    assigneeId: task.assigneeId,
    chamadoId: task.chamadoId,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    column,
    assignee: task.assignee,
    client: task.client,
    createdBy: task.createdBy,
    labels: task.labels.map((l) => l.label),
    checklist,
    overdue: false,
    dueSoon: false,
  });
}

export function groupTasksByColumn(
  columns: KanbanColumnItem[],
  tasks: TaskListItem[]
): Record<string, TaskListItem[]> {
  const grouped: Record<string, TaskListItem[]> = {};
  for (const column of columns) {
    grouped[column.id] = [];
  }

  for (const task of tasks) {
    if (!grouped[task.columnId]) grouped[task.columnId] = [];
    grouped[task.columnId].push(task);
  }

  for (const columnId of Object.keys(grouped)) {
    grouped[columnId].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt)
    );
  }

  return grouped;
}

export const TASK_PRIORITIES: TaskPriority[] = ["ALTA", "MEDIA", "BAIXA"];
