import type { ChamadoStatus } from "@prisma/client";
import { prisma } from "./prisma";

export const DEFAULT_CHAMADO_SLA_HOURS: Record<ChamadoStatus, number> = {
  ABERTO: 24,
  EM_ANDAMENTO: 72,
  AGUARDANDO_VALIDACAO: 48,
  AG_FECHAMENTO: 24,
  FECHADO: 0,
};

export async function getSlaHoursForStatus(teamId: string, status: ChamadoStatus) {
  const config = await prisma.chamadoSlaConfig.findUnique({
    where: { teamId_status: { teamId, status } },
  });
  if (config) return config.hours;
  return DEFAULT_CHAMADO_SLA_HOURS[status];
}

export async function computeChamadoSlaDueAt(teamId: string, status: ChamadoStatus, from = new Date()) {
  const hours = await getSlaHoursForStatus(teamId, status);
  if (hours <= 0 || status === "FECHADO") return null;
  return new Date(from.getTime() + hours * 60 * 60 * 1000);
}

export function isChamadoSlaBreached(slaDueAt: Date | null | undefined) {
  if (!slaDueAt) return false;
  return slaDueAt.getTime() < Date.now();
}

export function isChamadoSlaDueSoon(slaDueAt: Date | null | undefined, hours = 6) {
  if (!slaDueAt) return false;
  const ms = slaDueAt.getTime() - Date.now();
  return ms > 0 && ms <= hours * 60 * 60 * 1000;
}
