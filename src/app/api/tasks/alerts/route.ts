import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isAdminUser, TeamAccessError, assertUserHasTeam } from "@/lib/team-access";
import { buildTaskWhere } from "@/lib/task-access";
import { partitionTaskAlerts } from "@/lib/task-sla";
import { formatTaskForApi, taskListInclude } from "@/lib/task-query";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withAuth(async (user) => {
    const { searchParams } = new URL(request.url);
    const teamIdParam = searchParams.get("teamId");
    const teseId = searchParams.get("teseId");
    const assigneeId = searchParams.get("assigneeId");

    let teamId: string | null = teamIdParam;

    if (!isAdminUser(user)) {
      try {
        assertUserHasTeam(user);
        teamId = user.teamId!;
      } catch (err) {
        if (err instanceof TeamAccessError) {
          return NextResponse.json({ error: err.message }, { status: 403 });
        }
        throw err;
      }
    }

    const where: Prisma.TaskWhereInput =
      isAdminUser(user) && !teamId
        ? {
            ...(assigneeId ? { assigneeId } : {}),
            ...(teseId
              ? {
                  OR: [{ clientId: null }, { client: { teseId } }],
                }
              : {}),
          }
        : buildTaskWhere(user, {
            teamId: teamId ?? undefined,
            teseId,
            assigneeId,
          });

    const tasks = await prisma.task.findMany({
      where,
      include: taskListInclude,
    });

    const formatted = tasks.map(formatTaskForApi);
    const { overdue, dueSoon } = partitionTaskAlerts(formatted);

    return NextResponse.json({
      counts: { overdue: overdue.length, dueSoon: dueSoon.length },
      overdue,
      dueSoon,
    });
  });
}
