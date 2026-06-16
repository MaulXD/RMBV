import type { Prisma } from "@prisma/client";

export type MonthBucket = {
  monthKey: string;
  label: string;
  created: number;
  finalized: number;
  localized: number;
};

function monthKeyFromDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-");
  const d = new Date(Date.UTC(Number(y), Number(m) - 1, 1));
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");
}

export function buildRecentMonthKeys(count = 12): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    keys.push(monthKeyFromDate(d));
  }
  return keys;
}

export function monthRange(monthKey: string): { start: Date; end: Date } {
  const [y, m] = monthKey.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
  return { start, end };
}

export async function aggregateMonthlyTimeline(
  prisma: {
    client: {
      count: (args: { where: Prisma.ClientWhereInput }) => Promise<number>;
    };
    clientHistory: {
      count: (args: { where: Prisma.ClientHistoryWhereInput }) => Promise<number>;
    };
  },
  baseWhere: Prisma.ClientWhereInput,
  monthKeys: string[]
): Promise<MonthBucket[]> {
  const buckets: MonthBucket[] = [];

  for (const monthKey of monthKeys) {
    const { start, end } = monthRange(monthKey);

    const [created, finalized, localized] = await Promise.all([
      prisma.client.count({
        where: { ...baseWhere, createdAt: { gte: start, lt: end } },
      }),
      prisma.client.count({
        where: {
          ...baseWhere,
          workflowStatus: "FINALIZADO",
          finalizedAt: { gte: start, lt: end },
        },
      }),
      prisma.clientHistory.count({
        where: {
          type: "STATUS_CHANGE",
          toStatus: "LOCALIZADO",
          createdAt: { gte: start, lt: end },
          client: baseWhere,
        },
      }),
    ]);

    buckets.push({
      monthKey,
      label: monthLabel(monthKey),
      created,
      finalized,
      localized,
    });
  }

  return buckets;
}
