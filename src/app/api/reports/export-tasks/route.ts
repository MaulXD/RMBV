import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isAdminUser, teamScopeWhere } from "@/lib/team-access";
import { formatTaskForApi, taskListInclude } from "@/lib/task-query";

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
      include: taskListInclude,
    });

    const enriched = tasks.map(formatTaskForApi);

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
