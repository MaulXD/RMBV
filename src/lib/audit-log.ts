import type { AuditAction, Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export async function recordAuditLog(
  tx: Prisma.TransactionClient | typeof prisma,
  data: {
    userId?: string | null;
    action: AuditAction;
    entity: string;
    entityId?: string | null;
    summary: string;
    metadata?: Prisma.InputJsonValue;
  }
) {
  return tx.auditLog.create({
    data: {
      userId: data.userId ?? null,
      action: data.action,
      entity: data.entity,
      entityId: data.entityId ?? null,
      summary: data.summary,
      metadata: data.metadata,
    },
  });
}
