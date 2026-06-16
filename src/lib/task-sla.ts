import type { TaskListItem } from "./task-fields";

export const DUE_SOON_DAYS = 3;

export type TaskSlaStatus = "none" | "ok" | "due_soon" | "overdue";

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getTaskSlaStatus(task: Pick<TaskListItem, "dueAt" | "column">): TaskSlaStatus {
  if (!task.dueAt || task.column.isDone) return "none";

  const due = startOfDay(new Date(task.dueAt));
  const today = startOfDay(new Date());
  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "overdue";
  if (diffDays <= DUE_SOON_DAYS) return "due_soon";
  return "ok";
}

export function isTaskOverdue(task: Pick<TaskListItem, "dueAt" | "column">): boolean {
  return getTaskSlaStatus(task) === "overdue";
}

export function isTaskDueSoon(task: Pick<TaskListItem, "dueAt" | "column">): boolean {
  return getTaskSlaStatus(task) === "due_soon";
}

export function daysOverdue(task: Pick<TaskListItem, "dueAt" | "column">): number {
  if (!task.dueAt || task.column.isDone) return 0;
  const due = startOfDay(new Date(task.dueAt));
  const today = startOfDay(new Date());
  const diff = Math.round((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

export function daysUntilDue(task: Pick<TaskListItem, "dueAt" | "column">): number | null {
  if (!task.dueAt || task.column.isDone) return null;
  const due = startOfDay(new Date(task.dueAt));
  const today = startOfDay(new Date());
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function enrichTaskSla<T extends TaskListItem>(task: T): T & { dueSoon: boolean } {
  const status = getTaskSlaStatus(task);
  return {
    ...task,
    overdue: status === "overdue",
    dueSoon: status === "due_soon",
  };
}

export function partitionTaskAlerts(tasks: TaskListItem[]) {
  const overdue: TaskListItem[] = [];
  const dueSoon: TaskListItem[] = [];

  for (const task of tasks) {
    const enriched = enrichTaskSla(task);
    if (enriched.overdue) overdue.push(enriched);
    else if (enriched.dueSoon) dueSoon.push(enriched);
  }

  overdue.sort((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? ""));
  dueSoon.sort((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? ""));

  return { overdue, dueSoon };
}
