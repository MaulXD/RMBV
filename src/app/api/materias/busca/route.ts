import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api";
import { teamScopeWhere } from "@/lib/team-access";

export const runtime = "nodejs";

// Busca de clientes por ação (tese) para a página /materias.
// A página é pública, mas esta rota exige login: dados de cliente nunca saem sem sessão.
export async function GET(request: NextRequest) {
  return withAuth(async (user) => {
    const { searchParams } = new URL(request.url);
    const teseId = searchParams.get("teseId") || null;
    const q = (searchParams.get("q") ?? "").trim();
    const teamWhere = teamScopeWhere(user);

    const teses = await prisma.tese.findMany({
      where: { isActive: true, clients: { some: { ...teamWhere } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, _count: { select: { clients: true } } },
    });

    if (!teseId && q.length < 3) {
      return NextResponse.json({ teses, clientes: [] });
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
        teseRef: { select: { name: true } },
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

    return NextResponse.json({ teses, clientes });
  });
}
