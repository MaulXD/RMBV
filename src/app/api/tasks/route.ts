import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { TeamAccessError } from "@/lib/team-access";
import { buildTaskWhere, resolveTaskTeamId } from "@/lib/task-access";
import { assertColumnBelongsToTeam, getKanbanColumnsForTeam } from "@/lib/kanban-columns";
import { recordTaskHistory } from "@/lib/task-history";
import { formatTaskForApi, taskListInclude } from "@/lib/task-query";

export const runtime = "nodejs";

const createTaskSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(4000).optional().nullable(),
  priority: z.enum(["BAIXA", "MEDIA", "ALTA"]).optional(),
  columnId: z.string().uuid().optional(),
  dueAt: z.string().datetime().optional().nullable(),
  teamId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
  labelIds: z.array(z.string().uuid()).optional(),
  chamadoId: z.string().uuid().optional().nullable(),
});

export async function GET(request: Request) {
  return withAuth(async (user) => {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");
    const assigneeId = searchParams.get("assigneeId");
    const clientId = searchParams.get("clientId");
    const teseId = searchParams.get("teseId");
    const priority = searchParams.get("priority");
    const labelId = searchParams.get("labelId");
    const mineOnly = searchParams.get("mineOnly") === "1";

    const where = buildTaskWhere(user, {
      teamId,
      assigneeId,
      clientId,
      teseId,
      priority,
      labelId,
      mineOnly,
    });

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [{ columnId: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
      include: taskListInclude,
    });

    return NextResponse.json({
      tasks: tasks.map(formatTaskForApi),
    });
  });
}

export async function POST(request: Request) {
  return withAuth(async (user) => {
    const body = await request.json();
    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    let teamId: string;
    try {
      teamId = resolveTaskTeamId(user, parsed.data.teamId);
    } catch (err) {
      if (err instanceof TeamAccessError) {
        return NextResponse.json({ error: err.message }, { status: 403 });
      }
      throw err;
    }

    const columns = await getKanbanColumnsForTeam(teamId);
    const columnId = parsed.data.columnId ?? columns[0]?.id;
    if (!columnId) {
      return NextResponse.json({ error: "Nenhuma coluna disponível" }, { status: 400 });
    }

    try {
      await assertColumnBelongsToTeam(columnId, teamId);
    } catch {
      return NextResponse.json({ error: "Coluna inválida para esta equipe" }, { status: 400 });
    }

    if (parsed.data.clientId) {
      const client = await prisma.client.findFirst({
        where: { id: parsed.data.clientId, teamId },
        select: { id: true },
      });
      if (!client) {
        return NextResponse.json({ error: "Cliente não encontrado nesta equipe" }, { status: 400 });
      }
    }

    if (parsed.data.assigneeId) {
      const assignee = await prisma.user.findFirst({
        where: { id: parsed.data.assigneeId, teamId, isActive: true },
        select: { id: true },
      });
      if (!assignee) {
        return NextResponse.json({ error: "Responsável inválido para esta equipe" }, { status: 400 });
      }
    }

    const maxSort = await prisma.task.aggregate({
      where: { teamId, columnId },
      _max: { sortOrder: true },
    });

    const task = await prisma.$transaction(async (tx) => {
      const created = await tx.task.create({
        data: {
          title: parsed.data.title.trim(),
          description: parsed.data.description?.trim() || null,
          priority: parsed.data.priority ?? "MEDIA",
          columnId,
          dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
          teamId,
          clientId: parsed.data.clientId ?? null,
          assigneeId: parsed.data.assigneeId ?? null,
          chamadoId: parsed.data.chamadoId ?? null,
          createdById: user.id,
          sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
          ...(parsed.data.labelIds?.length
            ? {
                labels: {
                  create: parsed.data.labelIds.map((labelId) => ({ labelId })),
                },
              }
            : {}),
        },
        include: taskListInclude,
      });

      const column = columns.find((c) => c.id === columnId);
      await recordTaskHistory(tx, {
        taskId: created.id,
        createdById: user.id,
        type: "CREATED",
        note: `Tarefa criada em "${column?.name ?? "coluna"}"`,
      });

      return created;
    });

    return NextResponse.json({ task: formatTaskForApi(task) }, { status: 201 });
  });
}
