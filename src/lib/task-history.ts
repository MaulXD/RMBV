import type { TaskHistoryType, TaskPriority } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { PRIORITY_LABELS } from "./enum-labels";

export type TaskHistoryEntry = {
  id: string;
  taskId: string;
  type: TaskHistoryType;
  note: string | null;
  fromLabel: string | null;
  toLabel: string | null;
  createdAt: string;
  createdBy: { id: string; name: string };
};

const TYPE_LABELS: Record<TaskHistoryType, string> = {
  CREATED: "Tarefa criada",
  COMMENT: "Comentário",
  COLUMN_CHANGE: "Coluna alterada",
  FIELD_UPDATE: "Atualização",
};

export function taskHistoryTitle(entry: TaskHistoryEntry): string {
  if (entry.type === "COLUMN_CHANGE" && entry.fromLabel && entry.toLabel) {
    return `${entry.fromLabel} → ${entry.toLabel}`;
  }
  if (entry.type === "COMMENT") return "Comentário";
  return TYPE_LABELS[entry.type];
}

export function formatTaskHistoryEntry(row: {
  id: string;
  taskId: string;
  type: TaskHistoryType;
  note: string | null;
  fromLabel: string | null;
  toLabel: string | null;
  createdAt: Date;
  createdBy: { id: string; name: string };
}): TaskHistoryEntry {
  return {
    id: row.id,
    taskId: row.taskId,
    type: row.type,
    note: row.note,
    fromLabel: row.fromLabel,
    toLabel: row.toLabel,
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy,
  };
}

export const taskHistoryInclude = {
  createdBy: { select: { id: true, name: true } },
} as const;

export async function recordTaskHistory(
  tx: Prisma.TransactionClient,
  data: {
    taskId: string;
    createdById: string;
    type: TaskHistoryType;
    note?: string | null;
    fromLabel?: string | null;
    toLabel?: string | null;
  }
) {
  await tx.taskHistory.create({
    data: {
      taskId: data.taskId,
      createdById: data.createdById,
      type: data.type,
      note: data.note?.trim() || null,
      fromLabel: data.fromLabel ?? null,
      toLabel: data.toLabel ?? null,
    },
  });
}

type TaskSnapshot = {
  title: string;
  columnId: string;
  assigneeId: string | null;
  clientId: string | null;
  dueAt: Date | null;
  priority: TaskPriority;
};

export async function recordTaskFieldChanges(
  tx: Prisma.TransactionClient,
  opts: {
    taskId: string;
    createdById: string;
    before: TaskSnapshot;
    after: TaskSnapshot;
    columnNames: Map<string, string>;
    assigneeNames: Map<string, string>;
    clientNames: Map<string, string>;
  }
) {
  const logs: Array<{
    type: TaskHistoryType;
    note?: string;
    fromLabel?: string;
    toLabel?: string;
  }> = [];

  const { before, after } = opts;

  if (before.columnId !== after.columnId) {
    logs.push({
      type: "COLUMN_CHANGE",
      fromLabel: opts.columnNames.get(before.columnId) ?? "—",
      toLabel: opts.columnNames.get(after.columnId) ?? "—",
    });
  }

  if (before.title !== after.title) {
    logs.push({
      type: "FIELD_UPDATE",
      note: `Título: "${before.title}" → "${after.title}"`,
    });
  }

  if (before.assigneeId !== after.assigneeId) {
    const fromName = before.assigneeId
      ? (opts.assigneeNames.get(before.assigneeId) ?? "—")
      : "Sem responsável";
    const toName = after.assigneeId
      ? (opts.assigneeNames.get(after.assigneeId) ?? "—")
      : "Sem responsável";
    logs.push({
      type: "FIELD_UPDATE",
      note: `Responsável: ${fromName} → ${toName}`,
    });
  }

  if (before.clientId !== after.clientId) {
    const fromName = before.clientId
      ? (opts.clientNames.get(before.clientId) ?? "—")
      : "Sem cliente";
    const toName = after.clientId
      ? (opts.clientNames.get(after.clientId) ?? "—")
      : "Sem cliente";
    logs.push({
      type: "FIELD_UPDATE",
      note: `Cliente: ${fromName} → ${toName}`,
    });
  }

  const beforeDue = before.dueAt?.toISOString().slice(0, 10) ?? "";
  const afterDue = after.dueAt?.toISOString().slice(0, 10) ?? "";
  if (beforeDue !== afterDue) {
    logs.push({
      type: "FIELD_UPDATE",
      note: `Prazo: ${beforeDue || "—"} → ${afterDue || "—"}`,
    });
  }

  if (before.priority !== after.priority) {
    logs.push({
      type: "FIELD_UPDATE",
      note: `Prioridade: ${PRIORITY_LABELS[before.priority]} → ${PRIORITY_LABELS[after.priority]}`,
    });
  }

  for (const log of logs) {
    await recordTaskHistory(tx, {
      taskId: opts.taskId,
      createdById: opts.createdById,
      ...log,
    });
  }
}
