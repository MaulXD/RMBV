import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api";
import { teamScopeWhere, isAdminUser } from "@/lib/team-access";
import { ROLES_ADVOGADO, podeEditarAtualizacoes } from "@/lib/materias-access";

export const runtime = "nodejs";

type AtualizacaoOut = { id: string; data: string; titulo: string; texto: string; fonteUrl: string | null };

async function atualizacoesPorTese(ids: string[]) {
  const out: Record<string, AtualizacaoOut[]> = {};
  if (!ids.length) return out;
  try {
    const rows = await prisma.teseAtualizacao.findMany({
      where: { teseId: { in: ids } },
      orderBy: { data: "desc" },
      select: { id: true, teseId: true, data: true, titulo: true, texto: true, fonteUrl: true },
    });
    for (const r of rows) {
      const lista = (out[r.teseId] ??= []);
      if (lista.length < 20) lista.push({ id: r.id, data: r.data.toISOString(), titulo: r.titulo, texto: r.texto, fonteUrl: r.fonteUrl });
    }
  } catch (err) {
    // Tabela ainda não criada no banco: a busca continua funcionando sem as atualizações da equipe.
    console.error("teseAtualizacao indisponível", err);
  }
  return out;
}

// Busca de clientes por ação (tese) para a página /materias.
// A página é pública, mas esta rota exige login: dados de cliente nunca saem sem sessão.
export async function GET(request: NextRequest) {
  return withAuth(async (user) => {
    const { searchParams } = new URL(request.url);
    const teseId = searchParams.get("teseId") || null;
    const q = (searchParams.get("q") ?? "").trim();
    const teamWhere = teamScopeWhere(user);

    const teses = await prisma.tese.findMany({
      where: {
        isActive: true,
        ...(isAdminUser(user) ? {} : { teamId: user.teamId ?? "__no_team__" }),
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, teamId: true, _count: { select: { clients: true } } },
    });

    const usuario = { podeEditar: podeEditarAtualizacoes(user), nome: user.name };

    const advogados = await prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: ROLES_ADVOGADO },
        ...(isAdminUser(user) ? {} : { teamId: user.teamId ?? "__no_team__" }),
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true, teamId: true },
    });

    if (!teseId && q.length < 3) {
      return NextResponse.json({ teses, advogados, clientes: [], atualizacoes: {}, usuario });
    }

    const digits = q.replace(/\D/g, "");
    const clientes = await prisma.client.findMany({
      where: {
        ...teamWhere,
        ...(teseId ? { teseId } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" as const } },
                ...(digits.length >= 3 ? [{ cpf: { contains: digits } }, { cpf: { contains: q } }] : []),
                { acoes: { some: { numProcesso: { contains: q } } } },
                { acoes: { some: { numCNJ: { contains: q } } } },
              ],
            }
          : {}),
      },
      orderBy: { name: "asc" },
      take: 30,
      select: {
        id: true,
        name: true,
        cpf: true,
        status: true,
        teseId: true,
        teamId: true,
        teseRef: { select: { name: true } },
        advogado: { select: { id: true, name: true } },
        acoes: {
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            numProcesso: true,
            numCNJ: true,
            tribunal: true,
            vara: true,
            classe: true,
            advConfirmadoAt: true,
            docsEnviadosAt: true,
            entradaAt: true,
            sentencaAt: true,
            sentencaResultado: true,
            ultimaMovimentacaoAt: true,
            ultimaMovimentacaoText: true,
            ultimaConsultaAt: true,
            movimentacoes: {
              orderBy: { data: "desc" },
              take: 5,
              select: { id: true, data: true, texto: true, tipo: true },
            },
          },
        },
      },
    });

    const ids = new Set<string>();
    if (teseId) ids.add(teseId);
    for (const c of clientes) if (c.teseId) ids.add(c.teseId);
    const atualizacoes = await atualizacoesPorTese([...ids]);

    return NextResponse.json({ teses, advogados, clientes, atualizacoes, usuario });
  });
}
