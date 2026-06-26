export type DatajudProcesso = {
  numeroProcesso: string;
  classe?: { nome: string; codigo: number } | null;
  assunto?: { nome: string; codigo: number } | null;
  orgaoJulgador?: { nome: string; codigo: number } | null;
  dataAjuizamento?: string | null;
  dataDistribuicao?: string | null;
  valorAcao?: number | null;
  parteContraria?: string | null;
  tribunal?: string | null;
  movimentos: DatajudMovimento[];
};

export type DatajudMovimento = {
  dataHora: string;
  nome: string;
  complemento?: string | null;
  codigo: number;
};

const API_BASE = "https://api-publica.datajud.cnj.jus.br";
const AUTH_HEADER = "APIKey";

const COMMON_TRIBUNAIS = [
  "tjdft", "tjsp", "tjmg", "tjrj", "tjrs", "tjpr", "tjba",
  "tjgo", "tjpe", "tjsc", "tjrn", "tjce",
  "trf1", "trf2", "trf3", "trf4", "trf5", "trf6",
  "trt2", "trt3", "trt4", "trt5",
];

function apiKey(): string {
  const key = process.env.DATAJUD_API_KEY;
  if (!key) throw new Error("DATAJUD_API_KEY não configurada");
  return key;
}

async function consultarTribunal(numeroProcesso: string, tribunal: string): Promise<DatajudProcesso | null> {
  const key = apiKey();
  const url = `${API_BASE}/api_publica_${tribunal}/_search?q=numeroProcesso:"${numeroProcesso}"`;

  const res = await fetch(url, {
    headers: {
      Authorization: `${AUTH_HEADER} ${key}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    if (res.status === 404 || res.status === 400) return null;
    if (res.status === 429) throw new Error("Limite de consultas Datajud excedido");
    throw new Error(`Erro Datajud (${tribunal}): ${res.status}`);
  }

  const data = await res.json();
  const hits = data?.hits?.hits as Array<Record<string, unknown>> | undefined;
  if (!hits || hits.length === 0) return null;

  const source = hits[0]?._source as Record<string, unknown> | undefined;
  if (!source) return null;

  return parseDatajudResponse(numeroProcesso, source, tribunal);
}

function parseDatajudResponse(
  numeroProcesso: string,
  source: Record<string, unknown>,
  tribunal: string,
): DatajudProcesso {
  const movimentos = (source.movimentos as Array<Record<string, unknown>> || []).map((m) => ({
    dataHora: String(m.dataHora || m.data || ""),
    nome: String(m.nome || ""),
    complemento: m.complemento ? String(m.complemento) : null,
    codigo: Number(m.codigo || 0),
  }));

  return {
    numeroProcesso,
    classe: source.classe
      ? { nome: String((source.classe as Record<string, unknown>).nome || ""), codigo: Number((source.classe as Record<string, unknown>).codigo || 0) }
      : null,
    assunto: source.assunto
      ? { nome: String((source.assunto as Record<string, unknown>).nome || ""), codigo: Number((source.assunto as Record<string, unknown>).codigo || 0) }
      : null,
    orgaoJulgador: source.orgaoJulgador
      ? { nome: String((source.orgaoJulgador as Record<string, unknown>).nome || ""), codigo: Number((source.orgaoJulgador as Record<string, unknown>).codigo || 0) }
      : null,
    dataAjuizamento: source.dataAjuizamento ? String(source.dataAjuizamento) : null,
    dataDistribuicao: source.dataDistribuicao ? String(source.dataDistribuicao) : null,
    valorAcao: source.valorAcao ? Number(source.valorAcao) : null,
    parteContraria: source.parteContraria ? String(source.parteContraria) : null,
    tribunal: source.tribunal ? String(source.tribunal) : tribunal,
    movimentos,
  };
}

export async function consultarProcesso(numeroProcesso: string): Promise<DatajudProcesso> {
  const cleaned = numeroProcesso.replace(/\D/g, "");

  for (const tribunal of COMMON_TRIBUNAIS) {
    const result = await consultarTribunal(cleaned, tribunal);
    if (result) return result;
  }

  throw new Error("Processo não encontrado no Datajud");
}

import crypto from "crypto";

function generateMovHash(acaoId: string, data: string, texto: string): string {
  return crypto.createHash("sha256").update(`${acaoId}:${data}:${texto}`).digest("hex");
}

export function formatNumeroCNJ(numCNJ: string): string {
  const cleaned = numCNJ.replace(/\D/g, "");
  if (cleaned.length === 20) {
    return `${cleaned.slice(0, 7)}-${cleaned.slice(7, 9)}.${cleaned.slice(9, 13)}.${cleaned.slice(13, 14)}.${cleaned.slice(14, 16)}.${cleaned.slice(16)}`;
  }
  return numCNJ;
}

export async function validarConexaoDatajud(): Promise<{ ok: boolean; message: string }> {
  try {
    const key = apiKey();
    const res = await fetch(`${API_BASE}/api_publica_tjdft/_search`, {
      headers: {
        Authorization: `${AUTH_HEADER} ${key}`,
        "Content-Type": "application/json",
      },
    });
    if (res.ok) return { ok: true, message: "Conexão com Datajud OK" };
    return { ok: false, message: `Datajud retornou ${res.status}` };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Erro de conexão" };
  }
}

export { generateMovHash };
