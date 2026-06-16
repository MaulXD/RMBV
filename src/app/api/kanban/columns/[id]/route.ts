import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isAdminUser } from "@/lib/team-access";
import type { SessionUser } from "@/lib/auth";
import {
  canManageKanbanColumns,
  formatKanbanColumn,
} from "@/lib/kanban-columns";

export const runtime = "nodejs";

const updateColumnSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  color: z.string().max(20).optional().nullable(),
  isDone: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
  moveTasksToColumnId: z.string().uuid().optional(),
});

async function getColumnIfAllowed(id: string, user: SessionUser) {
  const column = await prisma.kanbanColumn.findUnique({ where: { id } });
  if (!column) return null;
  if (!isAdminUser(user) && column.teamId !== user.teamId) return null;
  return column;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    if (!canManageKanbanColumns(user)) {
      return NextResponse.json({ error: "Sem permissão para gerenciar colunas" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await getColumnIfAllowed(id, user);
    if (!existing) {
      return NextResponse.json({ error: "Coluna não encontrada" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateColumnSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const column = await prisma.kanbanColumn.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name.trim() } : {}),
        ...(parsed.data.color !== undefined ? { color: parsed.data.color?.trim() || null } : {}),
        ...(parsed.data.isDone !== undefined ? { isDone: parsed.data.isDone } : {}),
        ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
      },
    });

    return NextResponse.json({ column: formatKanbanColumn(column) });
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    if (!canManageKanbanColumns(user)) {
      return NextResponse.json({ error: "Sem permissão para gerenciar colunas" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await getColumnIfAllowed(id, user);
    if (!existing) {
      return NextResponse.json({ error: "Coluna não encontrada" }, { status: 404 });
    }

    const columnCount = await prisma.kanbanColumn.count({
      where: { teamId: existing.teamId },
    });
    if (columnCount <= 1) {
      return NextResponse.json({ error: "A equipe precisa de ao menos uma coluna" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const moveTo = searchParams.get("moveTasksTo");

    const taskCount = await prisma.task.count({ where: { columnId: id } });
    if (taskCount > 0) {
      if (!moveTo) {
        return NextResponse.json(
          { error: "Informe moveTasksTo para mover as tarefas antes de excluir" },
          { status: 400 }
        );
      }

      const target = await prisma.kanbanColumn.findFirst({
        where: { id: moveTo, teamId: existing.teamId },
      });
      if (!target) {
        return NextResponse.json({ error: "Coluna de destino inválida" }, { status: 400 });
      }

      await prisma.task.updateMany({
        where: { columnId: id },
        data: { columnId: moveTo },
      });
    }

    await prisma.kanbanColumn.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  });
}
