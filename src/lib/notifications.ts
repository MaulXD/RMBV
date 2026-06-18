import type { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export async function createNotification(
  tx: Prisma.TransactionClient | typeof prisma,
  data: {
    userId: string;
    type: NotificationType;
    title: string;
    body?: string;
    href?: string;
  }
) {
  return tx.notification.create({ data });
}

export async function createNotificationsForUsers(
  tx: Prisma.TransactionClient | typeof prisma,
  userIds: string[],
  data: Omit<Parameters<typeof createNotification>[1], "userId">
) {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return;
  await tx.notification.createMany({
    data: unique.map((userId) => ({ userId, ...data })),
  });
}

export async function notifyTeam(
  tx: Prisma.TransactionClient | typeof prisma,
  teamId: string,
  data: Omit<Parameters<typeof createNotification>[1], "userId">,
  excludeUserId?: string
) {
  const members = await tx.user.findMany({
    where: { teamId, isActive: true, ...(excludeUserId ? { id: { not: excludeUserId } } : {}) },
    select: { id: true },
  });
  await createNotificationsForUsers(
    tx,
    members.map((m) => m.id),
    data
  );
}
