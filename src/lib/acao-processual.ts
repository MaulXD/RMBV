import { prisma } from "@/lib/prisma";
import { consultarProcesso, generateMovHash, formatNumeroCNJ, type DatajudProcesso } from "@/lib/datajud";
import { scraperConsultarProcesso, type ScrapedProcesso } from "@/lib/scraper-courts";
import { createNotification } from "@/lib/notifications";
import { recordAuditLog } from "@/lib/audit-log";
import type { Prisma } from "@prisma/client";

export type ConsultaResult = {
  acao: Record<string, unknown>;
  novasMovimentacoes: number;
  atualizado: boolean;
  origem: "datajud" | "scraper" | "nenhum";
  erro?: string;
};

export async function consultarAcaoProcessual(acaoId: string, userId?: string): Promise<ConsultaResult> {
  const acao = await prisma.acao.findUnique({
    where: { id: acaoId },
    select: { id: true, numCNJ: true, numProcesso: true, teamId: true, client: { select: { name: true } } },
  });

  if (!acao) throw new Error("Ação não encontrada");

  const numProcesso = acao.numProcesso || acao.numCNJ;
  if (!numProcesso) throw new Error("Ação não possui número de processo cadastrado");

  // Tenta Datajud primeiro
  if (process.env.DATAJUD_API_KEY) {
    try {
      const processo = await consultarProcesso(numProcesso);
      const result = await salvarDadosProcessuais(acao, processo, userId);
      return { ...result, origem: "datajud" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      console.warn(`Datajud falhou (${msg}), tentando scraper...`);
    }
  }

  // Fallback: scraper
  try {
    const scraped = await scraperConsultarProcesso(numProcesso);
    if (scraped.erro) {
      return {
        acao: { id: acao.id },
        novasMovimentacoes: 0,
        atualizado: false,
        origem: "nenhum",
        erro: scraped.erro,
      };
    }
    const processo = converterScrapedParaDatajud(scraped);
    const result = await salvarDadosProcessuais(acao, processo, userId);
    return { ...result, origem: "scraper" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return {
      acao: { id: acao.id },
      novasMovimentacoes: 0,
      atualizado: false,
      origem: "nenhum",
      erro: msg,
    };
  }
}

function converterScrapedParaDatajud(scraped: ScrapedProcesso): DatajudProcesso {
  return {
    numeroProcesso: scraped.numeroProcesso,
    classe: scraped.classe ? { nome: scraped.classe, codigo: 0 } : null,
    assunto: scraped.assunto ? { nome: scraped.assunto, codigo: 0 } : null,
    orgaoJulgador: scraped.vara ? { nome: scraped.vara, codigo: 0 } : null,
    dataAjuizamento: scraped.dataAjuizamento ?? null,
    dataDistribuicao: scraped.dataDistribuicao ?? null,
    valorAcao: scraped.valorAcao ?? null,
    parteContraria: scraped.parteContraria ?? null,
    tribunal: scraped.tribunal ?? null,
    movimentos: (scraped.movimentos || []).map((m) => ({
      dataHora: m.data,
      nome: m.texto,
      codigo: 0,
      complemento: null,
    })),
  };
}

async function salvarDadosProcessuais(
  acao: { id: string; teamId: string | null; client: { name: string } },
  processo: DatajudProcesso,
  userId?: string,
): Promise<ConsultaResult> {
  let novasMovimentacoes = 0;
  let atualizado = false;

  const ultimoMovimento = processo.movimentos.length > 0
    ? processo.movimentos.reduce((a, b) => (a.dataHora > b.dataHora ? a : b))
    : null;

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.acao.update({
      where: { id: acao.id },
      data: {
        numProcesso: processo.numeroProcesso,
        classe: processo.classe?.nome ?? null,
        assunto: processo.assunto?.nome ?? null,
        vara: processo.orgaoJulgador?.nome ?? null,
        tribunal: processo.tribunal ?? null,
        dataAjuizamento: processo.dataAjuizamento ? new Date(processo.dataAjuizamento) : null,
        dataDistribuicao: processo.dataDistribuicao ? new Date(processo.dataDistribuicao) : null,
        valorAtualizado: processo.valorAcao ?? null,
        parteContraria: processo.parteContraria ?? null,
        ultimaConsultaAt: new Date(),
        consultaStatus: "sucesso",
      },
    });

    for (const mov of processo.movimentos) {
      const hash = generateMovHash(acao.id, mov.dataHora, mov.nome);
      const exists = await tx.movimentacao.findUnique({ where: { hash } });
      if (exists) continue;

      await tx.movimentacao.create({
        data: {
          acaoId: acao.id,
          data: new Date(mov.dataHora),
          texto: mov.nome + (mov.complemento ? ` — ${mov.complemento}` : ""),
          tipo: String(mov.codigo),
          hash,
        },
      });
      novasMovimentacoes++;
    }

    if (ultimoMovimento) {
      const ultimaData = await tx.movimentacao.findFirst({
        where: { acaoId: acao.id },
        orderBy: { data: "desc" },
        select: { data: true, texto: true },
      });

      if (ultimaData) {
        await tx.acao.update({
          where: { id: acao.id },
          data: {
            ultimaMovimentacaoAt: ultimaData.data,
            ultimaMovimentacaoText: ultimaData.texto,
          },
        });
        atualizado = true;
      }
    }

    if (userId) {
      await recordAuditLog(tx, {
        userId,
        action: "UPDATE",
        entity: "Acao",
        entityId: acao.id,
        summary: `Consulta processual: ${novasMovimentacoes} nova(s) movimentação(ões)`,
        metadata: { novasMovimentacoes, tribunal: processo.tribunal },
      });
    }

    if (novasMovimentacoes > 0 && acao.teamId) {
      const members = await tx.user.findMany({
        where: { teamId: acao.teamId, isActive: true },
        select: { id: true },
      });
      for (const member of members) {
        await createNotification(tx, {
          userId: member.id,
          type: "PROCESSUAL_UPDATE",
          title: "Nova movimentação processual",
          body: `${acao.client.name} — ${novasMovimentacoes} nova(s) movimentação(ões)`,
          href: `/acoes`,
        });
      }
    }
  });

  return {
    acao: { id: acao.id },
    novasMovimentacoes,
    atualizado,
    origem: "datajud" as const,
  };
}

export async function listarMovimentacoes(acaoId: string) {
  return prisma.movimentacao.findMany({
    where: { acaoId },
    orderBy: { data: "desc" },
  });
}

export async function getResumoProcessual(acaoId: string) {
  const acao = await prisma.acao.findUnique({
    where: { id: acaoId },
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
  return acao;
}

export async function agendarConsultasPendentes() {
  const acoes = await prisma.acao.findMany({
    where: {
      numProcesso: { not: null },
      OR: [
        { consultaStatus: "pendente" },
        { consultaStatus: "sucesso", ultimaConsultaAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      ],
    },
    select: { id: true, numProcesso: true },
    take: 50,
  });

  const results: Array<{ acaoId: string; ok: boolean; erro?: string }> = [];
  for (const acao of acoes) {
    try {
      await consultarAcaoProcessual(acao.id);
      results.push({ acaoId: acao.id, ok: true });
    } catch (err) {
      results.push({ acaoId: acao.id, ok: false, erro: err instanceof Error ? err.message : "Erro desconhecido" });
    }
  }
  return results;
}

export function formatNumeroProcesso(numero: string): string {
  return formatNumeroCNJ(numero);
}
