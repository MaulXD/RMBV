import type { Prisma } from "@prisma/client";
import type { SessionUser } from "./auth";
import { isAdminUser, TeamAccessError, assertUserHasTeam } from "./team-access";

export type TaskListFilters = {
  teamId?: string | null;
  assigneeId?: string | null;
  clientId?: string | null;
  teseId?: string | null;
};

export function resolveTaskTeamId(user: SessionUser, explicitTeamId?: string | null): string {
  if (isAdminUser(user)) {
    if (!explicitTeamId) {
      throw new TeamAccessError("Selecione uma equipe para gerenciar tarefas.");
    }
    return explicitTeamId;
  }
  assertUserHasTeam(user);
  return user.teamId!;
}

export function taskTeamWhere(
  user: SessionUser,
  teamId?: string | null
): Prisma.TaskWhereInput {
  if (isAdminUser(user)) {
    if (teamId) return { teamId };
    return { id: "__no_team__" };
  }
  if (!user.teamId) return { id: "__no_team__" };
  return { teamId: user.teamId };
}

export function buildTaskWhere(
  user: SessionUser,
  filters: TaskListFilters
): Prisma.TaskWhereInput {
  const teamWhere = taskTeamWhere(user, filters.teamId);

  return {
    ...teamWhere,
    ...(filters.assigneeId ? { assigneeId: filters.assigneeId } : {}),
    ...(filters.clientId ? { clientId: filters.clientId } : {}),
    ...(filters.teseId
      ? {
          OR: [{ clientId: null }, { client: { teseId: filters.teseId } }],
        }
      : {}),
  };
}
