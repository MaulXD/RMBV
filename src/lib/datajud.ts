export type DatajudConfig = {
  apiKey: string;
  baseUrl?: string;
};

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

function getConfig(): DatajudConfig {
  const apiKey = process.env.DATAJUD_API_KEY;
  if (!apiKey) {
    throw new Error("DATAJUD_API_KEY não configurada");
  }
  return {
    apiKey,
    baseUrl: process.env.DATAJUD_BASE_URL || "https://datajud.cnj.jus.br/api/v1",
  };
}

function extractTribunal(numeroProcesso: string): string {
  const partes = numeroProcesso.split("-");
  if (partes.length < 2) return "desconhecido";
  const dv = partes[1] || "";
  const justica = dv.slice(3, 4);
  const tribunal = dv.slice(4, 8);
  const mapa: Record<string, string> = {
    "1": "TJ", "2": "TRF", "3": "TRT", "4": "TRE", "5": "STM",
  };
  return `${mapa[justica] || "??"}-${tribunal}`;
}

function generateMovHash(acaoId: string, data: string, texto: string): string {
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(`${acaoId}:${data}:${texto}`).digest("hex");
}

export async function consultarProcesso(numeroProcesso: string): Promise<DatajudProcesso> {
  const config = getConfig();
  const cleaned = numeroProcesso.replace(/\D/g, "");
  const url = `${config.baseUrl}/processos/${cleaned}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Processo não encontrado no Datajud");
    }
    if (response.status === 429) {
      throw new Error("Limite de consultas Datajud excedido. Tente novamente mais tarde.");
    }
    throw new Error(`Erro Datajud: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return parseDatajudResponse(cleaned, data);
}

function parseDatajudResponse(numeroProcesso: string, raw: Record<string, unknown>): DatajudProcesso {
  const movimentos = (raw.movimentos as Array<Record<string, unknown>> || []).map((m) => ({
    dataHora: String(m.dataHora || m.data || ""),
    nome: String(m.nome || ""),
    complemento: m.complemento ? String(m.complemento) : null,
    codigo: Number(m.codigo || 0),
  }));

  const tribunal = raw.tribunal ? String(raw.tribunal) : extractTribunal(numeroProcesso);

  return {
    numeroProcesso,
    classe: raw.classe
      ? { nome: String((raw.classe as Record<string, unknown>).nome || ""), codigo: Number((raw.classe as Record<string, unknown>).codigo || 0) }
      : null,
    assunto: raw.assunto
      ? { nome: String((raw.assunto as Record<string, unknown>).nome || ""), codigo: Number((raw.assunto as Record<string, unknown>).codigo || 0) }
      : null,
    orgaoJulgador: raw.orgaoJulgador
      ? { nome: String((raw.orgaoJulgador as Record<string, unknown>).nome || ""), codigo: Number((raw.orgaoJulgador as Record<string, unknown>).codigo || 0) }
      : null,
    dataAjuizamento: raw.dataAjuizamento ? String(raw.dataAjuizamento) : null,
    dataDistribuicao: raw.dataDistribuicao ? String(raw.dataDistribuicao) : null,
    valorAcao: raw.valorAcao ? Number(raw.valorAcao) : null,
    parteContraria: raw.parteContraria ? String(raw.parteContraria) : null,
    tribunal,
    movimentos,
  };
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
    const config = getConfig();
    const response = await fetch(`${config.baseUrl}/health`, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
    });
    if (response.ok) return { ok: true, message: "Conexão com Datajud OK" };
    return { ok: false, message: `Datajud retornou ${response.status}` };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Erro de conexão" };
  }
}

export { generateMovHash };
