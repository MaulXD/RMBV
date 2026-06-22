import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth";

export class ScheduleBlockedError extends Error {
  status = 403;
  constructor(message = "Acesso fora do horário permitido") {
    super(message);
    this.name = "ScheduleBlockedError";
  }
}

function parseAllowedDays(raw: string): number[] {
  try {
    const days = JSON.parse(raw) as number[];
    return Array.isArray(days) ? days : [1, 2, 3, 4, 5];
  } catch {
    return [1, 2, 3, 4, 5];
  }
}

export function isWithinSchedule(days: number[], startHour: number, endHour: number): boolean {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  return days.includes(day) && hour >= startHour && hour < endHour;
}

export type ScheduleAccessResult = {
  allowed: boolean;
  source: "individual" | "team" | "none";
  startHour?: number;
  endHour?: number;
  allowedDays?: number[];
};

/** Verifica horário permitido para colaborador/pesquisador (regra individual > equipe). */
export async function getScheduleAccess(user: SessionUser): Promise<ScheduleAccessResult> {
  if (user.role !== Role.COLABORADOR && user.role !== Role.PESQUISADOR) {
    return { allowed: true, source: "none" };
  }

  const individual = await prisma.userAccessRule.findUnique({
    where: { userId: user.id },
  });

  if (individual?.enabled) {
    const days = parseAllowedDays(individual.allowedDays);
    return {
      allowed: isWithinSchedule(days, individual.startHour, individual.endHour),
      source: "individual",
      startHour: individual.startHour,
      endHour: individual.endHour,
      allowedDays: days,
    };
  }

  if (user.teamId) {
    const team = await prisma.team.findUnique({
      where: { id: user.teamId },
      select: {
        scheduleEnabled: true,
        scheduleDays: true,
        scheduleStart: true,
        scheduleEnd: true,
      },
    });

    if (team?.scheduleEnabled) {
      const days = parseAllowedDays(team.scheduleDays);
      return {
        allowed: isWithinSchedule(days, team.scheduleStart, team.scheduleEnd),
        source: "team",
        startHour: team.scheduleStart,
        endHour: team.scheduleEnd,
        allowedDays: days,
      };
    }
  }

  return { allowed: true, source: "none" };
}

export async function assertScheduleAccess(user: SessionUser) {
  const access = await getScheduleAccess(user);
  if (!access.allowed) {
    throw new ScheduleBlockedError();
  }
}
