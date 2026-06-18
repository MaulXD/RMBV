import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isAdminUser, assertUserHasTeam } from "@/lib/team-access";
import { isChamadoSlaBreached, isChamadoSlaDueSoon } from "@/lib/chamado-sla-config";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withAuth(async (user) => {
    const { searchParams } = new URL(request.url);
    const teamId = isAdminUser(user)
      ? searchParams.get("teamId")
      : user.teamId;

    if (!isAdminUser(user)) assertUserHasTeam(user);
    if (!teamId && !isAdminUser(user)) {
      return NextResponse.json({ error: "Sem equipe" }, { status: 400 });
    }

    const teamFilter = teamId ? { teamId } : {};

    const monthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

    const [openChamados, finalizationPending, tasks, goals] = await Promise.all([
      prisma.chamado.findMany({
        where: { ...teamFilter, status: { not: "FECHADO" } },
        select: {
          id: true,
          number: true,
          title: true,
          status: true,
          slaDueAt: true,
          assignee: { select: { name: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 20,
      }),
      prisma.client.count({
        where: { ...teamFilter, workflowStatus: "FINALIZACAO_SOLICITADA" },
      }),
      prisma.task.findMany({
        where: {
          ...teamFilter,
          column: { isDone: false },
        },
        select: {
          id: true,
          title: true,
          dueAt: true,
          priority: true,
          assignee: { select: { name: true } },
          column: { select: { isDone: true } },
        },
        take: 100,
      }),
      prisma.teamGoal.findMany({
        where: {
          ...teamFilter,
          monthKey,
        },
        include: { assignee: { select: { name: true } } },
      }),
    ]);

    const tasksOverdue = tasks.filter((t) => {
      if (!t.dueAt || t.column.isDone) return false;
      return new Date(t.dueAt).getTime() < Date.now();
    });
    const tasksDueSoon = tasks.filter((t) => {
      if (!t.dueAt || t.column.isDone) return false;
      const diff = new Date(t.dueAt).getTime() - Date.now();
      return diff > 0 && diff <= 3 * 24 * 60 * 60 * 1000;
    });
    const chamadoSlaBreached = openChamados.filter((c) => isChamadoSlaBreached(c.slaDueAt));
    const chamadoSlaSoon = openChamados.filter((c) => isChamadoSlaDueSoon(c.slaDueAt));

    return NextResponse.json({
      summary: {
        openChamados: openChamados.length,
        chamadoSlaBreached: chamadoSlaBreached.length,
        chamadoSlaSoon: chamadoSlaSoon.length,
        tasksOverdue: tasksOverdue.length,
        tasksDueSoon: tasksDueSoon.length,
        finalizationPending,
      },
      chamados: openChamados.slice(0, 8),
      chamadoSlaBreached: chamadoSlaBreached.slice(0, 5),
      tasksOverdue: tasksOverdue.slice(0, 5),
      goals,
    });
  });
}
