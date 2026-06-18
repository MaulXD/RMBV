import type { KanbanColumn } from "@prisma/client";
import { prisma } from "./prisma";
import type { SessionUser } from "./auth";

export function canManageKanbanColumns(user: SessionUser) {
  return user.role === "ADMIN" || user.role === "ADV" || user.role === "GERENTE";
}

export const DEFAULT_KANBAN_COLUMNS = [
  { name: "A fazer", sortOrder: 0, isDone: false, color: null },
  { name: "Em andamento", sortOrder: 1, isDone: false, color: null },
  { name: "Aguardando", sortOrder: 2, isDone: false, color: null },
  { name: "Concluído", sortOrder: 3, isDone: true, color: null },
] as const;

export type KanbanColumnItem = {
  id: string;
  teamId: string;
  name: string;
  sortOrder: number;
  color: string | null;
  isDone: boolean;
};

export function formatKanbanColumn(column: KanbanColumn): KanbanColumnItem {
  return {
    id: column.id,
    teamId: column.teamId,
    name: column.name,
    sortOrder: column.sortOrder,
    color: column.color,
    isDone: column.isDone,
  };
}

export async function ensureDefaultKanbanColumns(teamId: string): Promise<KanbanColumnItem[]> {
  const existing = await prisma.kanbanColumn.findMany({
    where: { teamId },
    orderBy: { sortOrder: "asc" },
  });

  if (existing.length > 0) {
    return existing.map(formatKanbanColumn);
  }

  const created = await prisma.$transaction(
    DEFAULT_KANBAN_COLUMNS.map((col) =>
      prisma.kanbanColumn.create({
        data: { teamId, ...col },
      })
    )
  );

  return created.map(formatKanbanColumn);
}

export async function getKanbanColumnsForTeam(teamId: string): Promise<KanbanColumnItem[]> {
  const columns = await prisma.kanbanColumn.findMany({
    where: { teamId },
    orderBy: { sortOrder: "asc" },
  });

  if (columns.length === 0) {
    return ensureDefaultKanbanColumns(teamId);
  }

  return columns.map(formatKanbanColumn);
}

export async function getDefaultKanbanColumnId(teamId: string) {
  const columns = await getKanbanColumnsForTeam(teamId);
  return columns.find((c) => !c.isDone)?.id ?? columns[0]?.id ?? null;
}

export async function assertColumnBelongsToTeam(columnId: string, teamId: string) {
  const column = await prisma.kanbanColumn.findFirst({
    where: { id: columnId, teamId },
  });
  if (!column) {
    throw new Error("Coluna inválida para esta equipe");
  }
  return column;
}
