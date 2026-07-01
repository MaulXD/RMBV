import { Role } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import type { SessionUser } from "./auth";

export class TeamAccessError extends Error {
  status = 403;
  constructor(message: string) {
    super(message);
    this.name = "TeamAccessError";
  }
}

export function isAdminUser(user: SessionUser) {
  return user.role === Role.ADMIN || user.role === Role.TI;
}

/** Filtro Prisma por equipe — admin não filtra */
export function teamScopeWhere(user: SessionUser): Prisma.ClientWhereInput {
  if (isAdminUser(user)) return {};
  if (!user.teamId) {
    return { id: "__no_team__" };
  }
  return { teamId: user.teamId };
}

/** Garante teamId em cadastros — clientes legados sem equipe só o admin vê */
export function assertClientHasTeam(teamId: string | null | undefined) {
  if (!teamId) {
    throw new TeamAccessError("Cliente sem equipe vinculada. Contate o administrador.");
  }
}

export function teamScopeForTese(user: SessionUser): Prisma.TeseWhereInput {
  if (isAdminUser(user)) return {};
  if (!user.teamId) return { id: "__no_team__" };
  return { teamId: user.teamId };
}

export function assertUserHasTeam(user: SessionUser) {
  if (isAdminUser(user)) return;
  if (!user.teamId) {
    throw new TeamAccessError("Usuário não vinculado a uma equipe. Contate o administrador.");
  }
}

export function canManageTeamMembers(user: SessionUser) {
  return user.role === Role.ADV && !!user.teamId;
}

export function canCreateTeamMemberRole(creator: SessionUser, targetRole: Role) {
  if (!canManageTeamMembers(creator)) return false;
  return targetRole === Role.GERENTE || targetRole === Role.COLABORADOR || targetRole === Role.PESQUISADOR;
}

export async function resolveTeamIdForCreate(
  user: SessionUser,
  explicitTeamId?: string | null
): Promise<string> {
  if (isAdminUser(user)) {
    if (!explicitTeamId) {
      throw new TeamAccessError("Administrador deve informar a equipe ao cadastrar.");
    }
    return explicitTeamId;
  }
  assertUserHasTeam(user);
  return user.teamId!;
}
