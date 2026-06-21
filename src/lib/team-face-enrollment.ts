import { Role } from "@prisma/client";
import type { SessionUser } from "./auth";
import { prisma } from "./prisma";
import { isAdminUser } from "./team-access";

export function canConfigureFaceEnrollmentSettings(user: SessionUser) {
  return user.role === Role.ADV || user.role === Role.ADMIN;
}

export async function canEnrollTeamMemberFace(
  actor: SessionUser,
  targetUserId: string,
): Promise<{ allowed: boolean; error?: string }> {
  if (actor.id === targetUserId) {
    return { allowed: true };
  }

  if (isAdminUser(actor)) {
    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });
    if (!target) return { allowed: false, error: "Usuário não encontrado" };
    return { allowed: true };
  }

  if (!actor.teamId) {
    return { allowed: false, error: "Sem equipe vinculada" };
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { teamId: true },
  });
  if (!target) return { allowed: false, error: "Usuário não encontrado" };
  if (target.teamId !== actor.teamId) {
    return { allowed: false, error: "Sem permissão para esta equipe" };
  }

  if (actor.role === Role.ADV) {
    return { allowed: true };
  }

  if (actor.role === Role.GERENTE) {
    const team = await prisma.team.findUnique({
      where: { id: actor.teamId },
      select: { allowGerenteFaceEnrollment: true },
    });
    if (!team?.allowGerenteFaceEnrollment) {
      return {
        allowed: false,
        error: "O ADV ainda não liberou o cadastro facial pelo gerente",
      };
    }
    return { allowed: true };
  }

  return { allowed: false, error: "Sem permissão" };
}

export function canUseTeamFaceEnrollmentUI(
  user: SessionUser,
  allowGerenteFaceEnrollment: boolean,
) {
  if (isAdminUser(user)) return true;
  if (user.role === Role.ADV) return true;
  if (user.role === Role.GERENTE && allowGerenteFaceEnrollment) return true;
  return false;
}
