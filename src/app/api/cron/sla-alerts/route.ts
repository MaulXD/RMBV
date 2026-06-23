import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Avoid duplicate SLA notifications within the same window
const SLA_DEDUPE_HOURS = 24;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 503 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const now = new Date();
  const dedupeWindow = new Date(now.getTime() - SLA_DEDUPE_HOURS * 60 * 60 * 1000);

  // Find overdue open chamados
  const overdueChamados = await prisma.chamado.findMany({
    where: {
      slaDueAt: { lt: now },
      status: { notIn: ["FECHADO"] },
    },
    select: {
      id: true,
      number: true,
      title: true,
      assigneeId: true,
      requesterId: true,
    },
    take: 100,
  });

  let chamadoNotifs = 0;
  for (const c of overdueChamados) {
    const recipients = [...new Set([c.assigneeId, c.requesterId].filter(Boolean))] as string[];
    for (const userId of recipients) {
      // Dedupe: skip if we sent a CHAMADO_SLA notification in the last 24h
      const recent = await prisma.notification.findFirst({
        where: {
          userId,
          type: "CHAMADO_SLA",
          href: `/chamados/${c.id}`,
          createdAt: { gte: dedupeWindow },
        },
        select: { id: true },
      });
      if (recent) continue;

      await prisma.notification.create({
        data: {
          userId,
          type: "CHAMADO_SLA",
          title: "SLA vencido",
          body: `#${c.number} — ${c.title}`,
          href: `/chamados/${c.id}`,
        },
      });
      chamadoNotifs++;
    }
  }

  // Find overdue open tasks (not in a "done" column)
  const overdueTasks = await prisma.task.findMany({
    where: {
      dueAt: { lt: now },
      assigneeId: { not: null },
      column: { isDone: false },
    },
    select: { id: true, title: true, assigneeId: true },
    take: 100,
  });

  let taskNotifs = 0;
  for (const t of overdueTasks) {
    if (!t.assigneeId) continue;

    const recent = await prisma.notification.findFirst({
      where: {
        userId: t.assigneeId,
        type: "TASK_OVERDUE",
        href: `/kanban`,
        createdAt: { gte: dedupeWindow },
        body: { contains: t.id },
      },
      select: { id: true },
    });
    if (recent) continue;

    await prisma.notification.create({
      data: {
        userId: t.assigneeId,
        type: "TASK_OVERDUE",
        title: "Tarefa em atraso",
        body: t.title,
        href: `/kanban`,
      },
    });
    taskNotifs++;
  }

  // Follow-up reminders for clients due today
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

  const dueFollowUps = await prisma.client.findMany({
    where: {
      followUpAt: { gte: todayStart, lte: todayEnd },
    },
    select: {
      id: true,
      name: true,
      teamId: true,
    },
    take: 200,
  });

  let followUpNotifs = 0;
  if (dueFollowUps.length > 0) {
    const teamIds = [...new Set(dueFollowUps.map((c) => c.teamId).filter(Boolean))] as string[];
    for (const teamId of teamIds) {
      const managers = await prisma.user.findMany({
        where: {
          teamId,
          role: { in: ["ADV", "GERENTE"] },
          isActive: true,
        },
        select: { id: true },
      });

      const teamClients = dueFollowUps.filter((c) => c.teamId === teamId);
      for (const manager of managers) {
        const recent = await prisma.notification.findFirst({
          where: {
            userId: manager.id,
            type: "GENERAL",
            title: "Retornos para hoje",
            createdAt: { gte: todayStart },
          },
          select: { id: true },
        });
        if (recent) continue;

        await prisma.notification.create({
          data: {
            userId: manager.id,
            type: "GENERAL",
            title: "Retornos para hoje",
            body: `${teamClients.length} cliente(s) com retorno agendado para hoje`,
            href: "/dashboard?followUpDue=true",
          },
        });
        followUpNotifs++;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    sent: { chamadoSla: chamadoNotifs, taskOverdue: taskNotifs, followUpReminders: followUpNotifs },
  });
}
