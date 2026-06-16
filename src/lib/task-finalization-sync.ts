import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { getKanbanColumnsForTeam, type KanbanColumnItem } from "./kanban-columns";
import { recordTaskHistory } from "./task-history";

function normalizeColumnName(name: string) {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export function findWaitingColumn(columns: KanbanColumnItem[]) {
  const exact = columns.find((c) => normalizeColumnName(c.name) === "aguardando");
  if (exact) return exact;
  return columns.find((c) => normalizeColumnName(c.name).includes("aguardando"));
}

export function findDoneColumn(columns: KanbanColumnItem[]) {
  const flagged = columns.find((c) => c.isDone);
  if (flagged) return flagged;
  return columns.find((c) => {
    const n = normalizeColumnName(c.name);
    return (
      n.includes("concluid") ||
      n.includes("finaliz") ||
      n.includes("feito") ||
      n === "done"
    );
  });
}

async function moveClientTasksInTx(
  tx: Prisma.TransactionClient,
  opts: {
    clientId: string;
    teamId: string;
    userId: string;
    mode: "request" | "complete";
    columns: KanbanColumnItem[];
  }
) {
  const target =
    opts.mode === "request"
      ? findWaitingColumn(opts.columns)
      : findDoneColumn(opts.columns);

  if (!target) return 0;

  const tasks = await tx.task.findMany({
    where: { clientId: opts.clientId, teamId: opts.teamId },
    include: { column: true },
  });

  const columnNames = new Map(opts.columns.map((c) => [c.id, c.name]));
  let moved = 0;

  for (const task of tasks) {
    if (task.columnId === target.id) continue;
    if (opts.mode === "request" && task.column.isDone) continue;

    const maxSort = await tx.task.aggregate({
      where: { teamId: opts.teamId, columnId: target.id },
      _max: { sortOrder: true },
    });

    await tx.task.update({
      where: { id: task.id },
      data: {
        columnId: target.id,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
    });

    await recordTaskHistory(tx, {
      taskId: task.id,
      createdById: opts.userId,
      type: "COLUMN_CHANGE",
      fromLabel: columnNames.get(task.columnId) ?? task.column.name,
      toLabel: target.name,
      note:
        opts.mode === "request"
          ? "Finalização do cliente solicitada"
          : "Cliente finalizado",
    });

    moved += 1;
  }

  return moved;
}

export async function syncClientTasksOnFinalizationRequest(
  clientId: string,
  teamId: string | null | undefined,
  userId: string
) {
  if (!teamId) return { moved: 0 };

  const columns = await getKanbanColumnsForTeam(teamId);
  const moved = await prisma.$transaction((tx) =>
    moveClientTasksInTx(tx, {
      clientId,
      teamId,
      userId,
      mode: "request",
      columns,
    })
  );

  return { moved };
}

export async function syncClientTasksOnFinalizationComplete(
  clientId: string,
  teamId: string | null | undefined,
  userId: string
) {
  if (!teamId) return { moved: 0 };

  const columns = await getKanbanColumnsForTeam(teamId);
  const moved = await prisma.$transaction((tx) =>
    moveClientTasksInTx(tx, {
      clientId,
      teamId,
      userId,
      mode: "complete",
      columns,
    })
  );

  return { moved };
}
