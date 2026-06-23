import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api";
import { teamScopeWhere } from "@/lib/team-access";

export const runtime = "nodejs";

const ALLOWED_ROLES = ["ADMIN", "ADV", "GERENTE"] as const;

export async function GET(request: NextRequest) {
  return withAuth(async (user) => {
    if (!ALLOWED_ROLES.includes(user.role as (typeof ALLOWED_ROLES)[number])) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const teseId = searchParams.get("teseId");
    const stage = searchParams.get("stage");
    const clientId = searchParams.get("clientId");

    const teamWhere = teamScopeWhere(user);

    const clientFilter: Record<string, unknown> = { ...teamWhere };
    if (teseId) clientFilter.teseId = teseId;
    if (clientId) clientFilter.id = clientId;

    const where: Record<string, unknown> = { client: clientFilter };
    if (stage === "adv") where.advConfirmadoAt = { not: null };
    else if (stage === "docs") where.docsEnviadosAt = { not: null };
    else if (stage === "entrada") where.entradaAt = { not: null };
    else if (stage === "sentenca") where.sentencaAt = { not: null };

    const acoes = await prisma.acao.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            cod: true,
            teseId: true,
            teseRef: { select: { id: true, name: true, color: true } },
            status: true,
          },
        },
        createdBy: { select: { id: true, name: true } },
        advConfirmadoBy: { select: { id: true, name: true } },
        docsEnviadosBy: { select: { id: true, name: true } },
        entradaBy: { select: { id: true, name: true } },
        sentencaBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ acoes });
  });
}

const createSchema = z.object({
  clientId: z.string().uuid(),
  numCNJ: z.string().optional().nullable(),
  valorCausa: z.number().optional().nullable(),
});

export async function POST(request: Request) {
  return withAuth(async (user) => {
    if (!ALLOWED_ROLES.includes(user.role as (typeof ALLOWED_ROLES)[number])) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const client = await prisma.client.findFirst({
      where: { id: parsed.data.clientId, ...teamScopeWhere(user) },
      select: { id: true, teamId: true },
    });
    if (!client) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }

    const acao = await prisma.acao.create({
      data: {
        clientId: parsed.data.clientId,
        teamId: client.teamId,
        numCNJ: parsed.data.numCNJ ?? null,
        valorCausa: parsed.data.valorCausa ?? null,
        createdById: user.id,
      },
      include: {
        client: { select: { id: true, name: true, cod: true } },
        createdBy: { select: { id: true, name: true } },
        advConfirmadoBy: { select: { id: true, name: true } },
        docsEnviadosBy: { select: { id: true, name: true } },
        entradaBy: { select: { id: true, name: true } },
        sentencaBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ acao }, { status: 201 });
  });
}
