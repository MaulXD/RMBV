import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isAdminUser, assertUserHasTeam } from "@/lib/team-access";
import type { SessionUser } from "@/lib/auth";
import { monthRange } from "@/lib/reports-timeline";

export const runtime = "nodejs";

const goalSchema = z.object({
  teamId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional().nullable(),
  monthKey: z.string().regex(/^\d{4}-\d{2}$/),
  targetFinalizations: z.number().int().min(1).max(100000),
});

function resolveTeamId(user: SessionUser, bodyTeamId?: string) {
  if (isAdminUser(user)) {
    if (!bodyTeamId) throw new Error("Informe a equipe da meta.");
    return bodyTeamId;
  }
  assertUserHasTeam(user);
  return user.teamId!;
}

async function countAchieved(
  teamId: string,
  monthKey: string,
  assigneeId: string | null | undefined
) {
  const { start, end } = monthRange(monthKey);
  return prisma.client.count({
    where: {
      teamId,
      workflowStatus: "FINALIZADO",
      finalizedAt: { gte: start, lt: end },
      ...(assigneeId ? { finalizedById: assigneeId } : {}),
    },
  });
}

export async function GET(request: Request) {
  return withAuth(async (user) => {
    const { searchParams } = new URL(request.url);
    const teamIdParam = searchParams.get("teamId");
    const monthKey = searchParams.get("monthKey");

    let teamId: string;
    if (isAdminUser(user)) {
      teamId = teamIdParam ?? user.teamId ?? "";
      if (!teamId) {
        return NextResponse.json({ error: "Informe teamId" }, { status: 400 });
      }
    } else {
      if (!user.teamId) {
        return NextResponse.json({ error: "Usuário sem equipe" }, { status: 403 });
      }
      teamId = user.teamId;
    }

    const goals = await prisma.teamGoal.findMany({
      where: {
        teamId,
        ...(monthKey ? { monthKey } : {}),
      },
      orderBy: [{ monthKey: "desc" }, { assignee: { name: "asc" } }],
      include: {
        assignee: { select: { id: true, name: true, role: true } },
      },
    });

    const enriched = await Promise.all(
      goals.map(async (goal) => {
        const achieved = await countAchieved(goal.teamId, goal.monthKey, goal.assigneeId);
        const pct =
          goal.targetFinalizations > 0
            ? Math.round((achieved / goal.targetFinalizations) * 100)
            : 0;
        return { ...goal, achieved, percent: Math.min(pct, 999) };
      })
    );

    return NextResponse.json({ goals: enriched });
  });
}

export async function POST(request: Request) {
  return withAuth(async (user) => {
    if (user.role === "COLABORADOR") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = goalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    let teamId: string;
    try {
      teamId = resolveTeamId(user, parsed.data.teamId);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Equipe inválida" },
        { status: 400 }
      );
    }

    if (parsed.data.assigneeId) {
      const assignee = await prisma.user.findFirst({
        where: { id: parsed.data.assigneeId, teamId },
      });
      if (!assignee) {
        return NextResponse.json({ error: "Responsável inválido para a equipe" }, { status: 400 });
      }
    }

    const existingGoal = await prisma.teamGoal.findFirst({
      where: {
        teamId,
        monthKey: parsed.data.monthKey,
        assigneeId: parsed.data.assigneeId ?? null,
      },
    });
    if (existingGoal) {
      return NextResponse.json(
        { error: "Meta já existe para este mês e responsável" },
        { status: 409 }
      );
    }

    try {
      const goal = await prisma.teamGoal.create({
        data: {
          teamId,
          assigneeId: parsed.data.assigneeId ?? null,
          monthKey: parsed.data.monthKey,
          targetFinalizations: parsed.data.targetFinalizations,
        },
        include: {
          assignee: { select: { id: true, name: true, role: true } },
        },
      });

      const achieved = await countAchieved(goal.teamId, goal.monthKey, goal.assigneeId);
      const pct =
        goal.targetFinalizations > 0
          ? Math.round((achieved / goal.targetFinalizations) * 100)
          : 0;

      return NextResponse.json(
        { goal: { ...goal, achieved, percent: Math.min(pct, 999) } },
        { status: 201 }
      );
    } catch {
      return NextResponse.json(
        { error: "Meta já existe para este mês e responsável" },
        { status: 409 }
      );
    }
  });
}
