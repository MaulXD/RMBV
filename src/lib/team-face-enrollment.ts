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

/** Remover rosto: ADV, Gerente (mesma equipe) e Admin. */
export async function canRemoveTeamMemberFace(
  actor: SessionUser,
  targetUserId: string,
): Promise<{ allowed: boolean; error?: string }> {
  if (actor.id === targetUserId) {
    return { allowed: true };
  }

  if (isAdminUser(actor)) {
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

  if (actor.role === Role.ADV || actor.role === Role.GERENTE) {
    return { allowed: true };
  }

  return { allowed: false, error: "Sem permissão" };
}

/** Média ponderada de N descritores face-api (128 floats). */
export function averageFaceDescriptors(
  descriptors: number[][],
  weights?: readonly number[],
): number[] {
  if (descriptors.length === 0) throw new Error("Nenhum descritor");
  const len = descriptors[0]!.length;
  let totalWeight = 0;
  const out = new Array<number>(len).fill(0);
  for (let i = 0; i < descriptors.length; i++) {
    const w = weights?.[i] ?? 1;
    totalWeight += w;
    const d = descriptors[i]!;
    for (let j = 0; j < len; j++) out[j]! += d[j]! * w;
  }
  for (let j = 0; j < len; j++) out[j]! /= totalWeight;
  return out;
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
