import type { FaceAuditAction, Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export async function recordFaceAudit(params: {
  actorId: string;
  targetUserId?: string | null;
  teamId?: string | null;
  action: FaceAuditAction;
  metadata?: Record<string, unknown>;
}) {
  await prisma.faceAuditLog.create({
    data: {
      actorId: params.actorId,
      targetUserId: params.targetUserId ?? null,
      teamId: params.teamId ?? null,
      action: params.action,
      metadata: (params.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function purgeFaceAuditOlderThan(days: number) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const result = await prisma.faceAuditLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  return result.count;
}
