import type { ChamadoHistoryType } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { CHAMADO_STATUS_LABELS } from "./enum-labels";

export type ChamadoHistoryEntry = {
  id: string;
  chamadoId: string;
  type: ChamadoHistoryType;
  note: string | null;
  fromLabel: string | null;
  toLabel: string | null;
  createdAt: string;
  createdBy: { id: string; name: string };
};

export const chamadoHistoryInclude = {
  createdBy: { select: { id: true, name: true } },
} as const;

export function formatChamadoHistoryEntry(row: {
  id: string;
  chamadoId: string;
  type: ChamadoHistoryType;
  note: string | null;
  fromLabel: string | null;
  toLabel: string | null;
  createdAt: Date;
  createdBy: { id: string; name: string };
}): ChamadoHistoryEntry {
  return {
    id: row.id,
    chamadoId: row.chamadoId,
    type: row.type,
    note: row.note,
    fromLabel: row.fromLabel,
    toLabel: row.toLabel,
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy,
  };
}

export async function recordChamadoHistory(
  tx: Prisma.TransactionClient,
  data: {
    chamadoId: string;
    createdById: string;
    type: ChamadoHistoryType;
    note?: string | null;
    fromLabel?: string | null;
    toLabel?: string | null;
  }
) {
  await tx.chamadoHistory.create({
    data: {
      chamadoId: data.chamadoId,
      createdById: data.createdById,
      type: data.type,
      note: data.note?.trim() || null,
      fromLabel: data.fromLabel ?? null,
      toLabel: data.toLabel ?? null,
    },
  });
}

export async function recordChamadoStatusChange(
  tx: Prisma.TransactionClient,
  data: {
    chamadoId: string;
    createdById: string;
    fromStatus: string;
    toStatus: string;
  }
) {
  const fromLabel = CHAMADO_STATUS_LABELS[data.fromStatus as keyof typeof CHAMADO_STATUS_LABELS] ?? data.fromStatus;
  const toLabel = CHAMADO_STATUS_LABELS[data.toStatus as keyof typeof CHAMADO_STATUS_LABELS] ?? data.toStatus;
  await recordChamadoHistory(tx, {
    chamadoId: data.chamadoId,
    createdById: data.createdById,
    type: "STATUS_CHANGE",
    fromLabel,
    toLabel,
    note: `Status alterado de "${fromLabel}" para "${toLabel}"`,
  });
}
