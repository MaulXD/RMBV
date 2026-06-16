import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isAdminUser, teamScopeWhere } from "@/lib/team-access";
import { enrichTaskSla } from "@/lib/task-sla";

export const runtime = "nodejs";

function escapeCsv(value: string | null | undefined) {
  const text = value ?? "";
  if (text.includes(";") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export async function GET(request: Request) {
  return withAuth(async (user) => {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");
    const teseId = searchParams.get("teseId");

    if (teamId && !isAdminUser(user)) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const effectiveTeamId = isAdminUser(user) ? teamId : user.teamId;
    if (!effectiveTeamId && !isAdminUser(user)) {
      return NextResponse.json({ error: "Usuário sem equipe" }, { status: 403 });
    }

    const tasks = await prisma.task.findMany({
      where: {
        ...(effectiveTeamId ? { teamId: effectiveTeamId } : {}),
        ...(teseId
          ? {
              client: {
                teseId,
                ...teamScopeWhere(user),
              },
            }
          : {}),
      },
      orderBy: [{ column: { sortOrder: "asc" } }, { sortOrder: "asc" }],
      include: {
        column: true,
        assignee: { select: { id: true, name: true } },
        client: { select: { id: true, name: true, cod: true, teseId: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    const enriched = tasks.map((task) =>
      enrichTaskSla({
        id: task.id,
        title: task.title,
        description: task.description,
        columnId: task.columnId,
        dueAt: task.dueAt?.toISOString() ?? null,
        sortOrder: task.sortOrder,
        teamId: task.teamId,
        clientId: task.clientId,
        assigneeId: task.assigneeId,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
        column: task.column,
        assignee: task.assignee,
        client: task.client,
        createdBy: task.createdBy,
        overdue: false,
        dueSoon: false,
      })
    );

    const header =
      "Título;Coluna;Responsável;Cliente;COD;Prazo;Atrasada;Criada em;Criada por";
    const rows = enriched.map((task) =>
      [
        escapeCsv(task.title),
        escapeCsv(task.column.name),
        escapeCsv(task.assignee?.name),
        escapeCsv(task.client?.name),
        escapeCsv(task.client?.cod),
        escapeCsv(task.dueAt ? new Date(task.dueAt).toLocaleDateString("pt-BR") : ""),
        task.overdue ? "Sim" : "Não",
        escapeCsv(new Date(task.createdAt).toLocaleString("pt-BR")),
        escapeCsv(task.createdBy.name),
      ].join(";")
    );

    const csv = `\uFEFF${header}\n${rows.join("\n")}`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="tarefas-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  });
}
