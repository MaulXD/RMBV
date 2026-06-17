import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { TeamAccessError } from "@/lib/team-access";
import {
  buildChamadoWhere,
  nextChamadoNumber,
  resolveChamadoTeamId,
} from "@/lib/chamado-access";
import { recordChamadoHistory } from "@/lib/chamado-history";
import { formatChamadoForApi, chamadoListInclude } from "@/lib/chamado-query";
import { CHAMADO_CATEGORY_LABELS } from "@/lib/enum-labels";

export const runtime = "nodejs";

const createChamadoSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(8000).optional().nullable(),
  category: z.enum(["BUG", "SUGESTOES", "SOLICITACOES"]),
  priority: z.enum(["BAIXA", "MEDIA", "ALTA"]).optional(),
  teamId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional().nullable(),
  clientId: z.string().uuid().optional().nullable(),
});

export async function GET(request: Request) {
  return withAuth(async (user) => {
    const { searchParams } = new URL(request.url);
    const where = buildChamadoWhere(user, {
      teamId: searchParams.get("teamId"),
      status: searchParams.get("status"),
      category: searchParams.get("category"),
      priority: searchParams.get("priority"),
      assigneeId: searchParams.get("assigneeId"),
      requesterId: searchParams.get("requesterId"),
      clientId: searchParams.get("clientId"),
      showClosed: searchParams.get("showClosed") === "1",
      search: searchParams.get("search"),
    });

    const chamados = await prisma.chamado.findMany({
      where,
      orderBy: [{ status: "asc" }, { number: "desc" }],
      include: chamadoListInclude,
    });

    return NextResponse.json({
      chamados: chamados.map(formatChamadoForApi),
    });
  });
}

export async function POST(request: Request) {
  return withAuth(async (user) => {
    const body = await request.json();
    const parsed = createChamadoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    let teamId: string;
    try {
      teamId = resolveChamadoTeamId(user, parsed.data.teamId);
    } catch (err) {
      if (err instanceof TeamAccessError) {
        return NextResponse.json({ error: err.message }, { status: 403 });
      }
      throw err;
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

    const chamado = await prisma.$transaction(async (tx) => {
      const number = await nextChamadoNumber(teamId);
      const created = await tx.chamado.create({
        data: {
          number,
          title: parsed.data.title.trim(),
          description: parsed.data.description?.trim() || null,
          category: parsed.data.category,
          priority: parsed.data.priority ?? "MEDIA",
          teamId,
          requesterId: user.id,
          assigneeId: parsed.data.assigneeId ?? null,
          clientId: parsed.data.clientId ?? null,
        },
        include: chamadoListInclude,
      });

      const categoryLabel = CHAMADO_CATEGORY_LABELS[parsed.data.category];
      await recordChamadoHistory(tx, {
        chamadoId: created.id,
        createdById: user.id,
        type: "CREATED",
        note: `Chamado #${number} criado (${categoryLabel})`,
      });

      return created;
    });

    return NextResponse.json({ chamado: formatChamadoForApi(chamado) }, { status: 201 });
  });
}
