import type { PontoRecord, PontoType, WorkType } from "@prisma/client";

export const WORK_TYPE_HOURS: Record<WorkType, number> = {
  ESTAGIARIO: 6,
  CLT: 8,
};

export type PontoRecordLike = Pick<PontoRecord, "type"> & { recordedAt: Date | string };

export function nextPontoType(recordsToday: PontoRecordLike[]): PontoType {
  if (recordsToday.length === 0) return "ENTRADA";
  const last = recordsToday[recordsToday.length - 1]!;
  switch (last.type) {
    case "ENTRADA":
      return "INTERVALO_INICIO";
    case "INTERVALO_INICIO":
      return "INTERVALO_FIM";
    case "INTERVALO_FIM":
      return "SAIDA";
    case "SAIDA":
      return "ENTRADA";
    default:
      return "ENTRADA";
  }
}

export function pontoTypeLabel(type: PontoType) {
  switch (type) {
    case "ENTRADA":
      return "Entrada";
    case "SAIDA":
      return "Saída";
    case "INTERVALO_INICIO":
      return "Início intervalo";
    case "INTERVALO_FIM":
      return "Fim intervalo";
    default:
      return type;
  }
}

/** Soma minutos trabalhados (entrada→intervalo + intervalo→saída). */
export function computeWorkedMinutes(records: PontoRecordLike[]): number {
  const sorted = [...records].sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
  );

  let total = 0;
  let workStart: Date | null = null;

  for (const r of sorted) {
    const t = new Date(r.recordedAt);
    switch (r.type) {
      case "ENTRADA":
        workStart = t;
        break;
      case "INTERVALO_INICIO":
        if (workStart) {
          total += Math.max(0, (t.getTime() - workStart.getTime()) / 60_000);
          workStart = null;
        }
        break;
      case "INTERVALO_FIM":
        workStart = t;
        break;
      case "SAIDA":
        if (workStart) {
          total += Math.max(0, (t.getTime() - workStart.getTime()) / 60_000);
          workStart = null;
        }
        break;
    }
  }

  return Math.round(total);
}

export function formatMinutes(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h${String(m).padStart(2, "0")}`;
}

export function hoursSummary(records: PontoRecordLike[], workType: WorkType) {
  const worked = computeWorkedMinutes(records);
  const target = WORK_TYPE_HOURS[workType] * 60;
  return {
    workedMinutes: worked,
    targetMinutes: target,
    deltaMinutes: worked - target,
    workedLabel: formatMinutes(worked),
    targetLabel: `${WORK_TYPE_HOURS[workType]}h`,
  };
}
