import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { TeamAccessError } from "@/lib/team-access";
import { resolveTaskTeamId } from "@/lib/task-access";
import { canManageKanbanColumns } from "@/lib/kanban-columns";

export const runtime = "nodejs";

const reorderSchema = z.object({
  teamId: z.string().uuid(),
  columnIds: z.array(z.string().uuid()).min(1),
});

export async function POST(request: Request) {
  return withAuth(async (user) => {
    if (!canManageKanbanColumns(user)) {
      return NextResponse.json({ error: "Sem permissão para gerenciar colunas" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = reorderSchema.safeParse(body);
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

    const columns = await prisma.kanbanColumn.findMany({
      where: { teamId },
      select: { id: true },
    });

    if (columns.length !== parsed.data.columnIds.length) {
      return NextResponse.json({ error: "Lista de colunas incompleta" }, { status: 400 });
    }

    const validIds = new Set(columns.map((c) => c.id));
    if (!parsed.data.columnIds.every((id) => validIds.has(id))) {
      return NextResponse.json({ error: "Coluna inválida na lista" }, { status: 400 });
    }

    await prisma.$transaction(
      parsed.data.columnIds.map((id, index) =>
        prisma.kanbanColumn.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );

    return NextResponse.json({ ok: true });
  });
}
