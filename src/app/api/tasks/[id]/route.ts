import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getTaskIfAllowed } from "@/lib/task-access";
import { assertColumnBelongsToTeam, getKanbanColumnsForTeam } from "@/lib/kanban-columns";
import { recordTaskFieldChanges } from "@/lib/task-history";
import { formatTaskForApi, taskListInclude } from "@/lib/task-query";

export const runtime = "nodejs";

const updateTaskSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().max(4000).optional().nullable(),
  priority: z.enum(["BAIXA", "MEDIA", "ALTA"]).optional(),
  columnId: z.string().uuid().optional(),
  dueAt: z.string().datetime().optional().nullable(),
  clientId: z.string().uuid().optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
  labelIds: z.array(z.string().uuid()).optional(),
});

async function buildNameMaps(teamId: string, clientIds: string[], assigneeIds: string[]) {
  const columns = await getKanbanColumnsForTeam(teamId);
  const columnNames = new Map(columns.map((c) => [c.id, c.name]));

  const assignees =
    assigneeIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: assigneeIds }, teamId },
          select: { id: true, name: true },
        })
      : [];
  const assigneeNames = new Map(assignees.map((u) => [u.id, u.name]));

  const clients =
    clientIds.length > 0
      ? await prisma.client.findMany({
          where: { id: { in: clientIds }, teamId },
          select: { id: true, name: true },
        })
      : [];
  const clientNames = new Map(clients.map((c) => [c.id, c.name]));

  return { columnNames, assigneeNames, clientNames };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    const { id } = await params;
    const existing = await getTaskIfAllowed(id, user);
    if (!existing) {
      return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    if (parsed.data.columnId) {
      try {
        await assertColumnBelongsToTeam(parsed.data.columnId, existing.teamId);
      } catch {
        return NextResponse.json({ error: "Coluna inválida para esta equipe" }, { status: 400 });
      }
    }

    if (parsed.data.clientId) {
      const client = await prisma.client.findFirst({
        where: { id: parsed.data.clientId, teamId: existing.teamId },
        select: { id: true },
      });
      if (!client) {
        return NextResponse.json({ error: "Cliente não encontrado nesta equipe" }, { status: 400 });
      }
    }

    if (parsed.data.assigneeId) {
      const assignee = await prisma.user.findFirst({
        where: { id: parsed.data.assigneeId, teamId: existing.teamId, isActive: true },
        select: { id: true },
      });
      if (!assignee) {
        return NextResponse.json({ error: "Responsável inválido para esta equipe" }, { status: 400 });
      }
    }

    let sortOrder = parsed.data.sortOrder;
    const nextColumnId = parsed.data.columnId ?? existing.columnId;

    if (parsed.data.columnId && parsed.data.columnId !== existing.columnId && sortOrder === undefined) {
      const maxSort = await prisma.task.aggregate({
        where: { teamId: existing.teamId, columnId: nextColumnId },
        _max: { sortOrder: true },
      });
      sortOrder = (maxSort._max.sortOrder ?? -1) + 1;
    }

    const nextDueAt =
      parsed.data.dueAt !== undefined
        ? parsed.data.dueAt
          ? new Date(parsed.data.dueAt)
          : null
        : existing.dueAt;

    const afterSnapshot = {
      title: parsed.data.title !== undefined ? parsed.data.title.trim() : existing.title,
      columnId: nextColumnId,
      assigneeId:
        parsed.data.assigneeId !== undefined ? parsed.data.assigneeId : existing.assigneeId,
      clientId: parsed.data.clientId !== undefined ? parsed.data.clientId : existing.clientId,
      dueAt: nextDueAt,
      priority: parsed.data.priority !== undefined ? parsed.data.priority : existing.priority,
    };

    const beforeSnapshot = {
      title: existing.title,
      columnId: existing.columnId,
      assigneeId: existing.assigneeId,
      clientId: existing.clientId,
      dueAt: existing.dueAt,
      priority: existing.priority,
    };

    const clientIds = [beforeSnapshot.clientId, afterSnapshot.clientId].filter(Boolean) as string[];
    const assigneeIds = [beforeSnapshot.assigneeId, afterSnapshot.assigneeId].filter(
      Boolean
    ) as string[];
    const { columnNames, assigneeNames, clientNames } = await buildNameMaps(
      existing.teamId,
      clientIds,
      assigneeIds
    );

    const task = await prisma.$transaction(async (tx) => {
      if (parsed.data.labelIds !== undefined) {
        await tx.taskLabelOnTask.deleteMany({ where: { taskId: id } });
        if (parsed.data.labelIds.length > 0) {
          await tx.taskLabelOnTask.createMany({
            data: parsed.data.labelIds.map((labelId) => ({ taskId: id, labelId })),
          });
        }
      }

      const updated = await tx.task.update({
        where: { id },
        data: {
          ...(parsed.data.title !== undefined ? { title: parsed.data.title.trim() } : {}),
          ...(parsed.data.description !== undefined
            ? { description: parsed.data.description?.trim() || null }
            : {}),
          ...(parsed.data.priority !== undefined ? { priority: parsed.data.priority } : {}),
          ...(parsed.data.columnId !== undefined ? { columnId: parsed.data.columnId } : {}),
          ...(parsed.data.dueAt !== undefined ? { dueAt: nextDueAt } : {}),
          ...(parsed.data.clientId !== undefined ? { clientId: parsed.data.clientId } : {}),
          ...(parsed.data.assigneeId !== undefined ? { assigneeId: parsed.data.assigneeId } : {}),
          ...(sortOrder !== undefined ? { sortOrder } : {}),
        },
        include: taskListInclude,
      });

      await recordTaskFieldChanges(tx, {
        taskId: id,
        createdById: user.id,
        before: beforeSnapshot,
        after: afterSnapshot,
        columnNames,
        assigneeNames,
        clientNames,
      });

      return updated;
    });

    return NextResponse.json({ task: formatTaskForApi(task) });
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    const { id } = await params;
    const existing = await getTaskIfAllowed(id, user);
    if (!existing) {
      return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 });
    }

    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  });
}
