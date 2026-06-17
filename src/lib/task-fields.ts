import type { TaskPriority } from "@prisma/client";
import type { KanbanColumnItem } from "./kanban-columns";
import type { ChecklistProgress } from "./task-checklist";

export type TaskLabelItem = {
  id: string;
  name: string;
  color: string;
};

export type TaskListItem = {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  columnId: string;
  dueAt: string | null;
  sortOrder: number;
  teamId: string;
  clientId: string | null;
  assigneeId: string | null;
  chamadoId: string | null;
  createdAt: string;
  updatedAt: string;
  column: KanbanColumnItem;
  assignee: { id: string; name: string } | null;
  client: { id: string; name: string; cod: string | null; teseId: string | null } | null;
  createdBy: { id: string; name: string };
  labels: TaskLabelItem[];
  checklist: ChecklistProgress;
  overdue: boolean;
  dueSoon: boolean;
};
