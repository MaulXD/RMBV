import type { KanbanColumnItem } from "./kanban-columns";

export type TaskListItem = {
  id: string;
  title: string;
  description: string | null;
  columnId: string;
  dueAt: string | null;
  sortOrder: number;
  teamId: string;
  clientId: string | null;
  assigneeId: string | null;
  createdAt: string;
  updatedAt: string;
  column: KanbanColumnItem;
  assignee: { id: string; name: string } | null;
  client: { id: string; name: string; cod: string | null; teseId: string | null } | null;
  createdBy: { id: string; name: string };
  overdue: boolean;
  dueSoon: boolean;
};
