import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getChamadoIfAllowed } from "@/lib/chamado-access";
import { getKanbanColumnsForTeam } from "@/lib/kanban-columns";
import { recordTaskHistory } from "@/lib/task-history";
import { formatTaskForApi, taskListInclude } from "@/lib/task-query";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    const { id } = await params;
    const chamado = await getChamadoIfAllowed(id, user);
    if (!chamado) {
      return NextResponse.json({ error: "Chamado não encontrado" }, { status: 404 });
    }

    if (chamado.linkedTask) {
      return NextResponse.json(
        { error: "Este chamado já possui uma tarefa vinculada", task: chamado.linkedTask },
        { status: 409 }
      );
    }

    const columns = await getKanbanColumnsForTeam(chamado.teamId);
    const column = columns.find((c) => !c.isDone) ?? columns[0];
    if (!column) {
      return NextResponse.json({ error: "Nenhuma coluna disponível no Kanban" }, { status: 400 });
    }

    const maxSort = await prisma.task.aggregate({
      where: { teamId: chamado.teamId, columnId: column.id },
      _max: { sortOrder: true },
    });

    const description = [
      chamado.description?.trim(),
      "",
      `---`,
      `Vinculado ao chamado #${chamado.number}`,
    ]
      .filter(Boolean)
      .join("\n");

    const task = await prisma.$transaction(async (tx) => {
      const created = await tx.task.create({
        data: {
          title: chamado.title,
          description: description || null,
          priority: chamado.priority,
          columnId: column.id,
          teamId: chamado.teamId,
          clientId: chamado.clientId,
          assigneeId: chamado.assigneeId,
          chamadoId: chamado.id,
          createdById: user.id,
          sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
        },
        include: taskListInclude,
      });

      await recordTaskHistory(tx, {
        taskId: created.id,
        createdById: user.id,
        type: "CREATED",
        note: `Tarefa criada a partir do chamado #${chamado.number}`,
      });

      return created;
    });

    return NextResponse.json({ task: formatTaskForApi(task) }, { status: 201 });
  });
}
