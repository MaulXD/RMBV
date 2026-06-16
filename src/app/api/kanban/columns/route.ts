import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { TeamAccessError } from "@/lib/team-access";
import { resolveTaskTeamId } from "@/lib/task-access";
import {
  canManageKanbanColumns,
  ensureDefaultKanbanColumns,
  formatKanbanColumn,
  getKanbanColumnsForTeam,
} from "@/lib/kanban-columns";

export const runtime = "nodejs";

const createColumnSchema = z.object({
  teamId: z.string().uuid(),
  name: z.string().min(2).max(60),
  color: z.string().max(20).optional().nullable(),
  isDone: z.boolean().optional(),
});

export async function GET(request: Request) {
  return withAuth(async (user) => {
    const { searchParams } = new URL(request.url);
    const teamIdParam = searchParams.get("teamId");

    let teamId: string;
    try {
      teamId = resolveTaskTeamId(user, teamIdParam);
    } catch (err) {
      if (err instanceof TeamAccessError) {
        return NextResponse.json({ error: err.message }, { status: 403 });
      }
      throw err;
    }

    const columns = await getKanbanColumnsForTeam(teamId);
    return NextResponse.json({ columns });
  });
}

export async function POST(request: Request) {
  return withAuth(async (user) => {
    if (!canManageKanbanColumns(user)) {
      return NextResponse.json({ error: "Sem permissão para gerenciar colunas" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createColumnSchema.safeParse(body);
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

    await ensureDefaultKanbanColumns(teamId);

    const maxSort = await prisma.kanbanColumn.aggregate({
      where: { teamId },
      _max: { sortOrder: true },
    });

    try {
      const column = await prisma.kanbanColumn.create({
        data: {
          teamId,
          name: parsed.data.name.trim(),
          color: parsed.data.color?.trim() || null,
          isDone: parsed.data.isDone ?? false,
          sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
        },
      });

      return NextResponse.json({ column: formatKanbanColumn(column) }, { status: 201 });
    } catch {
      return NextResponse.json({ error: "Já existe uma coluna com este nome" }, { status: 409 });
    }
  });
}
