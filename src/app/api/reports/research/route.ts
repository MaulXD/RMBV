import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { countWorkingDays, brazilianHolidaySet, isWorkingDay, dateKey } from "@/lib/brazilian-holidays";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withAuth(async (user) => {
    const { searchParams } = new URL(request.url);
    const startRaw = searchParams.get("startDate");
    const endRaw = searchParams.get("endDate");
    if (!startRaw || !endRaw) {
      return NextResponse.json({ error: "startDate e endDate obrigatórios" }, { status: 400 });
    }

    const startDate = new Date(startRaw + "T00:00:00");
    const endDate = new Date(endRaw + "T23:59:59");
    const teamId = user.role === "ADMIN"
      ? (searchParams.get("teamId") || undefined)
      : (user.teamId ?? undefined);

    // Busca histórico de pesquisas no período
    const entries = await prisma.clientHistory.findMany({
      where: {
        type: "PESQUISA_UPDATED",
        createdAt: { gte: startDate, lte: endDate },
        ...(teamId ? { client: { teamId } } : {}),
      },
      select: {
        id: true,
        createdAt: true,
        createdById: true,
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const workingDays = countWorkingDays(startDate, endDate);

    // Agrupa por usuário
    type UserStats = {
      id: string;
      name: string;
      total: number;
      byDay: Record<string, number>;
    };
    const byUser = new Map<string, UserStats>();

    for (const e of entries) {
      const key = dateKey(e.createdAt);
      const existing = byUser.get(e.createdById) ?? {
        id: e.createdById,
        name: e.createdBy.name,
        total: 0,
        byDay: {},
      };
      existing.total++;
      existing.byDay[key] = (existing.byDay[key] ?? 0) + 1;
      byUser.set(e.createdById, existing);
    }

    const users = Array.from(byUser.values())
      .sort((a, b) => b.total - a.total)
      .map((u) => ({
        ...u,
        avgPerDay: workingDays > 0 ? +(u.total / workingDays).toFixed(2) : 0,
      }));

    // Timeline diária (apenas dias úteis com atividade ou todos os úteis do período)
    const years: number[] = [];
    for (let y = startDate.getFullYear(); y <= endDate.getFullYear(); y++) years.push(y);
    const holidays = brazilianHolidaySet(years);

    const dailyMap = new Map<string, number>();
    for (const e of entries) {
      const k = dateKey(e.createdAt);
      dailyMap.set(k, (dailyMap.get(k) ?? 0) + 1);
    }

    const timeline: { date: string; count: number; isWorkingDay: boolean }[] = [];
    const cur = new Date(startDate);
    cur.setHours(0, 0, 0, 0);
    const endNorm = new Date(endDate);
    endNorm.setHours(0, 0, 0, 0);
    while (cur <= endNorm) {
      const k = dateKey(cur);
      const working = isWorkingDay(cur, holidays);
      if (dailyMap.has(k) || working) {
        timeline.push({ date: k, count: dailyMap.get(k) ?? 0, isWorkingDay: working });
      }
      cur.setDate(cur.getDate() + 1);
    }

    return NextResponse.json({
      period: { start: startRaw, end: endRaw },
      workingDays,
      totalPesquisas: entries.length,
      avgPerDay: workingDays > 0 ? +(entries.length / workingDays).toFixed(2) : 0,
      users,
      timeline,
    });
  });
}
