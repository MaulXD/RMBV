import { Role } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { isAdminUser } from "@/lib/team-access";

/** Quem pode registrar ou apagar atualizações de uma ação (tese). */
export function podeEditarAtualizacoes(user: SessionUser) {
  return isAdminUser(user) || user.role === Role.GERENTE || user.role === Role.ADV;
}

/** Perfis que podem ser advogado responsável por um cliente. */
export const ROLES_ADVOGADO: Role[] = [Role.ADV, Role.GERENTE];

/** A tese pertence à equipe do usuário (admin vê todas). */
export function teseNoEscopo(user: SessionUser, teseTeamId: string | null) {
  if (isAdminUser(user)) return true;
  return !!user.teamId && teseTeamId === user.teamId;
}
