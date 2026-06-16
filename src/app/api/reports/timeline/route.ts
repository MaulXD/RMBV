import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { buildClientWhere } from "@/lib/client-query";
import {
  aggregateMonthlyTimeline,
  buildRecentMonthKeys,
  monthRange,
} from "@/lib/reports-timeline";
import { isAdminUser } from "@/lib/team-access";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withAuth(async (user) => {
    const { searchParams } = new URL(request.url);
    const teseId = searchParams.get("teseId");
    const teamId = searchParams.get("teamId");
    const assigneeId = searchParams.get("assigneeId");
    const months = Math.min(24, Math.max(3, Number(searchParams.get("months") ?? 12)));

    if (teamId && !isAdminUser(user)) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    if (teamId && isAdminUser(user)) {
      // admin filter ok
    } else if (!isAdminUser(user) && user.teamId) {
      // non-admin scoped to team via buildClientWhere
    }

    const baseWhere = await buildClientWhere(user, {
      teseId,
      teamId: isAdminUser(user) ? teamId : null,
    });

    if (assigneeId) {
      Object.assign(baseWhere, { createdById: assigneeId });
    }

    const monthKeys = buildRecentMonthKeys(months);
    const timeline = await aggregateMonthlyTimeline(prisma, baseWhere, monthKeys);

    const currentKey = monthKeys[monthKeys.length - 1];
    const { start, end } = monthRange(currentKey);
    const [activeClients, pendingFinalization] = await Promise.all([
      prisma.client.count({
        where: { ...baseWhere, workflowStatus: "EM_ANDAMENTO" },
      }),
      prisma.client.count({
        where: { ...baseWhere, workflowStatus: "FINALIZACAO_SOLICITADA" },
      }),
    ]);

    return NextResponse.json({
      timeline,
      summary: {
        activeClients,
        pendingFinalization,
        currentMonthCreated: timeline[timeline.length - 1]?.created ?? 0,
        currentMonthFinalized: timeline[timeline.length - 1]?.finalized ?? 0,
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
      },
    });
  });
}
