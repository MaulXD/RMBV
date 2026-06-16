import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth";
import { isAdminUser } from "@/lib/team-access";
import { assertColumnBelongsToTeam } from "@/lib/kanban-columns";
import { formatTaskForApi, taskListInclude } from "@/lib/task-query";

export const runtime = "nodejs";

const updateTaskSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().max(4000).optional().nullable(),
  columnId: z.string().uuid().optional(),
  dueAt: z.string().datetime().optional().nullable(),
  clientId: z.string().uuid().optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
});

async function getTaskIfAllowed(id: string, user: SessionUser) {
  const task = await prisma.task.findUnique({
    where: { id },
    include: taskListInclude,
  });
  if (!task) return null;
  if (!isAdminUser(user) && task.teamId !== user.teamId) {
    return null;
  }
  return task;
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

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(parsed.data.title !== undefined ? { title: parsed.data.title.trim() } : {}),
        ...(parsed.data.description !== undefined
          ? { description: parsed.data.description?.trim() || null }
          : {}),
        ...(parsed.data.columnId !== undefined ? { columnId: parsed.data.columnId } : {}),
        ...(parsed.data.dueAt !== undefined
          ? { dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null }
          : {}),
        ...(parsed.data.clientId !== undefined ? { clientId: parsed.data.clientId } : {}),
        ...(parsed.data.assigneeId !== undefined ? { assigneeId: parsed.data.assigneeId } : {}),
        ...(sortOrder !== undefined ? { sortOrder } : {}),
      },
      include: taskListInclude,
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
