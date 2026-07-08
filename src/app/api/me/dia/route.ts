import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isAdminUser } from "@/lib/team-access";
import { partitionTaskAlerts } from "@/lib/task-sla";
import { formatTaskForApi, taskListInclude } from "@/lib/task-query";
import { clientListInclude } from "@/lib/client-query";
import { formatClientForApi } from "@/lib/client-fields";

export const runtime = "nodejs";

export async function GET() {
  return withAuth(async (user) => {
    const isAdmin = isAdminUser(user);
    const teamId = user.teamId;

    // Tasks: admins see tasks assigned to them across all teams;
    // regular users see all open tasks in their team.
    let taskWhere: Prisma.TaskWhereInput;
    if (isAdmin) {
      taskWhere = {
        assigneeId: user.id,
        column: { isDone: false },
      };
    } else if (teamId) {
      taskWhere = {
        teamId,
        column: { isDone: false },
      };
    } else {
      return NextResponse.json({
        overdue: [],
        dueSoon: [],
        followUps: [],
        counts: { overdue: 0, dueSoon: 0, followUps: 0 },
      });
    }

    const todayStart = new Date(new Date().toDateString());

    const [tasks, clients] = await Promise.all([
      prisma.task.findMany({
        where: taskWhere,
        include: taskListInclude,
        take: 100,
      }),
      teamId
        ? prisma.client.findMany({
            where: {
              teamId,
              followUpAt: { lte: todayStart },
            },
            include: clientListInclude,
            orderBy: { followUpAt: "asc" },
            take: 30,
          })
        : Promise.resolve([]),
    ]);

    const formatted = tasks.map(formatTaskForApi);
    const { overdue, dueSoon } = partitionTaskAlerts(formatted);

    const followUps = clients.map((c) => {
      const f = formatClientForApi(c);
      return {
        id: f.id,
        name: f.name,
        cod: f.cod,
        followUpAt: f.followUpAt ?? null,
        status: f.status,
      };
    });

    return NextResponse.json({
      overdue,
      dueSoon,
      followUps,
      counts: {
        overdue: overdue.length,
        dueSoon: dueSoon.length,
        followUps: followUps.length,
      },
    });
  });
}
