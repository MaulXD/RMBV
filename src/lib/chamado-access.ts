import type { Prisma } from "@prisma/client";
import type { SessionUser } from "./auth";
import { prisma } from "./prisma";
import { isAdminUser, TeamAccessError, assertUserHasTeam } from "./team-access";
import { chamadoListInclude } from "./chamado-query";

export type ChamadoListFilters = {
  teamId?: string | null;
  status?: string | null;
  category?: string | null;
  priority?: string | null;
  assigneeId?: string | null;
  requesterId?: string | null;
  clientId?: string | null;
  showClosed?: boolean;
  search?: string | null;
};

export function resolveChamadoTeamId(user: SessionUser, explicitTeamId?: string | null): string {
  if (isAdminUser(user)) {
    if (!explicitTeamId) {
      throw new TeamAccessError("Selecione uma equipe para gerenciar chamados.");
    }
    return explicitTeamId;
  }
  assertUserHasTeam(user);
  return user.teamId!;
}

export function chamadoTeamWhere(
  user: SessionUser,
  teamId?: string | null
): Prisma.ChamadoWhereInput {
  if (isAdminUser(user)) {
    if (teamId) return { teamId };
    return { id: "__no_team__" };
  }
  if (!user.teamId) return { id: "__no_team__" };
  return { teamId: user.teamId };
}

export function buildChamadoWhere(
  user: SessionUser,
  filters: ChamadoListFilters
): Prisma.ChamadoWhereInput {
  const teamWhere = chamadoTeamWhere(user, filters.teamId);

  const statusFilter =
    filters.status && filters.status !== "all"
      ? { status: filters.status as Prisma.EnumChamadoStatusFilter["equals"] }
      : !filters.showClosed
        ? { status: { not: "FECHADO" as const } }
        : {};

  const search = filters.search?.trim();
  const searchFilter = search
    ? {
        OR: [
          { title: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  return {
    ...teamWhere,
    ...statusFilter,
    ...searchFilter,
    ...(filters.category && filters.category !== "all"
      ? { category: filters.category as Prisma.EnumChamadoCategoryFilter["equals"] }
      : {}),
    ...(filters.priority && filters.priority !== "all"
      ? { priority: filters.priority as Prisma.EnumTaskPriorityFilter["equals"] }
      : {}),
    ...(filters.assigneeId ? { assigneeId: filters.assigneeId } : {}),
    ...(filters.requesterId ? { requesterId: filters.requesterId } : {}),
    ...(filters.clientId ? { clientId: filters.clientId } : {}),
  };
}

export async function getChamadoIfAllowed(id: string, user: SessionUser) {
  const chamado = await prisma.chamado.findUnique({
    where: { id },
    include: chamadoListInclude,
  });
  if (!chamado) return null;
  if (!isAdminUser(user) && chamado.teamId !== user.teamId) return null;
  return chamado;
}

export async function nextChamadoNumber(teamId: string): Promise<number> {
  const max = await prisma.chamado.aggregate({
    where: { teamId },
    _max: { number: true },
  });
  return (max._max.number ?? 0) + 1;
}
