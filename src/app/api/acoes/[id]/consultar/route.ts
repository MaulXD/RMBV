import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api";
import { consultarAcaoProcessual } from "@/lib/acao-processual";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAuth(async (user) => {
    if (!["ADMIN", "ADV", "GERENTE"].includes(user.role)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const { id } = await params;

    const acao = await prisma.acao.findUnique({
      where: { id },
      select: { id: true, numCNJ: true, numProcesso: true },
    });
    if (!acao) {
      return NextResponse.json({ error: "Ação não encontrada" }, { status: 404 });
    }

    const numProcesso = acao.numProcesso || acao.numCNJ;
    if (!numProcesso) {
      return NextResponse.json({ error: "Ação não possui número de processo cadastrado" }, { status: 400 });
    }

    const result = await consultarAcaoProcessual(id, user.id);

    if (result.erro) {
      if (result.origem === "nenhum") {
        await prisma.acao.update({
          where: { id },
          data: { consultaStatus: "erro", ultimaConsultaAt: new Date() },
        });
        return NextResponse.json({ error: result.erro }, { status: 502 });
      }
    }

    return NextResponse.json(result);
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAuth(async (user) => {
    if (!["ADMIN", "ADV", "GERENTE"].includes(user.role)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const { id } = await params;

    const acao = await prisma.acao.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!acao) {
      return NextResponse.json({ error: "Ação não encontrada" }, { status: 404 });
    }

    const movimentacoes = await prisma.movimentacao.findMany({
      where: { acaoId: id },
      orderBy: { data: "desc" },
      take: 500,
    });

    const resumo = await prisma.acao.findUnique({
      where: { id },
      select: {
        id: true,
        numProcesso: true,
        numCNJ: true,
        classe: true,
        assunto: true,
        vara: true,
        foro: true,
        tribunal: true,
        sistema: true,
        ultimaMovimentacaoAt: true,
        ultimaMovimentacaoText: true,
        dataAjuizamento: true,
        dataDistribuicao: true,
        valorAtualizado: true,
        parteContraria: true,
        ultimaConsultaAt: true,
        consultaStatus: true,
        _count: { select: { movimentacoes: true } },
      },
    });

    return NextResponse.json({ movimentacoes, resumo });
  });
}
