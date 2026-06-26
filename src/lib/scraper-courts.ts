import { chromium } from "playwright";

export type ScrapedProcesso = {
  numeroProcesso: string;
  classe?: string | null;
  assunto?: string | null;
  vara?: string | null;
  foro?: string | null;
  tribunal?: string | null;
  dataAjuizamento?: string | null;
  dataDistribuicao?: string | null;
  parteContraria?: string | null;
  valorAcao?: number | null;
  ultimaMovimentacao?: { data: string; texto: string } | null;
  movimentos: Array<{ data: string; texto: string }>;
  erro?: string;
};

export type ScrapedCPFResult = {
  cpf: string;
  tribunal: string;
  processos: Array<{
    numero: string;
    classe?: string;
    parte?: string;
    ultimaMovimentacao?: string;
  }>;
  erro?: string;
};

const MAPA_TRIBUNAIS: Record<string, { nome: string; pje?: string; esaj?: boolean }> = {
  "01": { nome: "TJAC", pje: "pje.tjac.jus.br" },
  "02": { nome: "TJAL", pje: "pje.tjal.jus.br" },
  "03": { nome: "TJAP", pje: "pje.tjap.jus.br" },
  "04": { nome: "TJAM", pje: "pje.tjam.jus.br" },
  "05": { nome: "TJBA", pje: "pje.tjba.jus.br" },
  "06": { nome: "TJCE", pje: "pje.tjce.jus.br" },
  "07": { nome: "TJDF" },
  "08": { nome: "TJES", pje: "pje.tjes.jus.br" },
  "09": { nome: "TJGO", pje: "pje.tjgo.jus.br" },
  "10": { nome: "TJMA", pje: "pje.tjma.jus.br" },
  "11": { nome: "TJMT", pje: "pje.tjmt.jus.br" },
  "12": { nome: "TJMS", pje: "pje.tjms.jus.br" },
  "13": { nome: "TJMG", pje: "pje.tjmg.jus.br" },
  "14": { nome: "TJPA", pje: "pje.tjpa.jus.br" },
  "15": { nome: "TJPB", pje: "pje.tjpb.jus.br" },
  "16": { nome: "TJPR", pje: "pje.tjpr.jus.br" },
  "17": { nome: "TJPE", pje: "pje.tjpe.jus.br" },
  "18": { nome: "TJPI", pje: "pje.tjpi.jus.br" },
  "19": { nome: "TJRJ", pje: "pje.tjrj.jus.br" },
  "20": { nome: "TJRN", pje: "pje.tjrn.jus.br" },
  "21": { nome: "TJRS", pje: "pje.tjrs.jus.br" },
  "22": { nome: "TJRO", pje: "pje.tjro.jus.br" },
  "23": { nome: "TJRR", pje: "pje.tjrr.jus.br" },
  "24": { nome: "TJSC", pje: "eproc.tjsc.jus.br" },
  "25": { nome: "TJSE", pje: "pje.tjse.jus.br" },
  "26": { nome: "TJSP", esaj: true },
  "27": { nome: "TJTO", pje: "pje.tjto.jus.br" },
};

function extrairDadosCNJ(numeroCNJ: string): { justica: string; tr: string; tribunal: string } {
  const cleaned = numeroCNJ.replace(/\D/g, "");
  if (cleaned.length < 20) return { justica: "?", tr: "?", tribunal: "desconhecido" };
  const justica = cleaned[13];
  const tr = cleaned.slice(14, 16);
  const nome = MAPA_TRIBUNAIS[tr]?.nome || `TR-${tr}`;
  return { justica, tr, tribunal: nome };
}

async function extrairHTMLviaFetch(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    return res.text();
  } catch {
    return null;
  }
}

async function extrairViaPlaywright(url: string): Promise<string | null> {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" });
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);
    return await page.content();
  } catch {
    return null;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

function parsePJeHTML(html: string, numeroProcesso: string): ScrapedProcesso {
  const resultado: ScrapedProcesso = {
    numeroProcesso,
    movimentos: [],
  };

  const classeMatch = html.match(/Classe[\s\S]{0,50}?<td[^>]*>([^<]+)<\/td>/i);
  if (classeMatch) resultado.classe = classeMatch[1].trim();

  const assuntoMatch = html.match(/Assunto[\s\S]{0,50}?<td[^>]*>([^<]+)<\/td>/i);
  if (assuntoMatch) resultado.assunto = assuntoMatch[1].trim();

  const varaMatch = html.match(/(?:Órgão julgador|Vara|Juízo)[\s\S]{0,50}?<td[^>]*>([^<]+)<\/td>/i);
  if (varaMatch) resultado.vara = varaMatch[1].trim();

  const distribuicaoMatch = html.match(/Distribuiç[ãa]o[\s\S]{0,50}?<td[^>]*>([^<\n]+)/i);
  if (distribuicaoMatch) resultado.dataDistribuicao = distribuicaoMatch[1].trim();

  const valorMatch = html.match(/Valor da aç[ãa]o[\s\S]{0,50}?<td[^>]*>([^<]+)<\/td>/i);
  if (valorMatch) {
    const v = valorMatch[1].replace(/[^\d,]/g, "").replace(".", "").replace(",", ".");
    const parsed = parseFloat(v);
    if (!isNaN(parsed)) resultado.valorAcao = parsed;
  }

  const movTable = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g);
  if (movTable) {
    for (const row of movTable) {
      const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g);
      if (!cells || cells.length < 2) continue;
      const dataRaw = cells[0].replace(/<[^>]+>/g, "").trim();
      const textoRaw = cells.slice(1).map((c: string) => c.replace(/<[^>]+>/g, "").trim()).filter(Boolean).join(" ");
      if (dataRaw && textoRaw && dataRaw.match(/\d{2}\/\d{2}\/\d{4}/)) {
        resultado.movimentos.push({ data: dataRaw, texto: textoRaw });
      }
    }
  }

  if (resultado.movimentos.length > 0) {
    const ultimo = resultado.movimentos[resultado.movimentos.length - 1];
    resultado.ultimaMovimentacao = { data: ultimo.data, texto: ultimo.texto };
  }

  return resultado;
}

function parseESAJSHTML(html: string, numeroProcesso: string): ScrapedProcesso {
  const resultado: ScrapedProcesso = {
    numeroProcesso,
    movimentos: [],
  };

  const classeMatch = html.match(/Classe[:\s]*<[^>]*>([^<]+)<\/span>/i) || html.match(/Classe[:\s]*([^<\n]+)/i);
  if (classeMatch) resultado.classe = classeMatch[1].trim();

  const assuntoMatch = html.match(/Assunto[:\s]*<[^>]*>([^<]+)<\/span>/i) || html.match(/Assunto[:\s]*([^<\n]+)/i);
  if (assuntoMatch) resultado.assunto = assuntoMatch[1].trim();

  const varaMatch = html.match(/(?:Vara|Juízo)[:\s]*<[^>]*>([^<]+)<\/span>/i) || html.match(/(?:Vara|Juízo)[:\s]*([^<\n]+)/i);
  if (varaMatch) resultado.vara = varaMatch[1].trim();

  const foroMatch = html.match(/Foro[:\s]*<[^>]*>([^<]+)<\/span>/i) || html.match(/Foro[:\s]*([^<\n]+)/i);
  if (foroMatch) resultado.foro = foroMatch[1].trim();

  const distribuicaoMatch = html.match(/Distribuição[:\s]*<[^>]*>([^<]+)<\/span>/i) || html.match(/Distribuição[:\s]*([^<\n]+)/i);
  if (distribuicaoMatch) resultado.dataDistribuicao = distribuicaoMatch[1].trim();

  const parteMatch = html.match(/Parte Contrária[:\s]*<[^>]*>([^<]+)<\/span>/i) || html.match(/Requerido[:\s]*([^<\n]+)/i);
  if (parteMatch) resultado.parteContraria = parteMatch[1].trim();

  const movSection = html.match(/<table[^>]*id="tabelaUltimasMovimentacoes"[^>]*>([\s\S]*?)<\/table>/i);
  if (movSection) {
    const movRows = movSection[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/g);
    if (movRows) {
      for (const row of movRows) {
        const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g);
        if (!cells || cells.length < 2) continue;
        const dataRaw = cells[0].replace(/<[^>]+>/g, "").trim();
        const textoRaw = cells.slice(1).map((c: string) => c.replace(/<[^>]+>/g, "").trim()).filter(Boolean).join(" ");
        if (dataRaw && textoRaw) {
          resultado.movimentos.push({ data: dataRaw, texto: textoRaw });
        }
      }
    }
  }

  if (resultado.movimentos.length > 0) {
    const ultimo = resultado.movimentos[resultado.movimentos.length - 1];
    resultado.ultimaMovimentacao = { data: ultimo.data, texto: ultimo.texto };
  }

  return resultado;
}

function formatNumeroPJe(numero: string): string {
  const cleaned = numero.replace(/\D/g, "");
  if (cleaned.length === 20) {
    return `${cleaned.slice(0, 7)}${cleaned.slice(7, 9)}${cleaned.slice(9, 13)}${cleaned.slice(13, 14)}${cleaned.slice(14, 16)}${cleaned.slice(16)}`;
  }
  return cleaned;
}

export async function scraperConsultarProcesso(numeroCNJ: string): Promise<ScrapedProcesso> {
  const info = extrairDadosCNJ(numeroCNJ);
  const cleaned = numeroCNJ.replace(/\D/g, "");

  // Tenta PJe primeiro
  const tribunal = MAPA_TRIBUNAIS[info.tr];
  if (tribunal?.pje) {
    const numPJe = formatNumeroPJe(numeroCNJ);
    const url = `https://${tribunal.pje}/pje/ConsultaPublica/listView.seam?numeroProcesso=${numPJe}`;

    let html = await extrairHTMLviaFetch(url);
    if (!html) html = await extrairViaPlaywright(url);

    if (html && html.includes("numeroProcesso")) {
      const result = parsePJeHTML(html, cleaned);
      result.tribunal = tribunal.nome;
      return result;
    }
  }

  // Tenta e-SAJ (TJSP)
  if (tribunal?.esaj) {
    const numAno = cleaned.slice(0, 15);
    const url = `https://esaj.tjsp.jus.br/cpopg/search.do?dadosConsulta.localPesquisa.cdLocal=1&dadosConsulta.tipoNuProcesso=UNIFICADO&numeroDigitoAnoUnificado=${numAno.slice(0, 11)}&dadosConsulta.nuProcesso=${cleaned}`;

    let html = await extrairHTMLviaFetch(url);
    if (!html) html = await extrairViaPlaywright(url);

    if (html && (html.includes("classe") || html.includes("Classe"))) {
      const result = parseESAJSHTML(html, cleaned);
      result.tribunal = tribunal.nome;
      return result;
    }
  }

  // Tenta TJRJ (Portal unificado)
  if (info.tr === "19") {
    const url = `https://www.tjrj.jus.br/processos/consulta?numero=${cleaned}`;
    let html = await extrairHTMLviaFetch(url);
    if (!html) html = await extrairViaPlaywright(url);
    if (html) {
      const result = parsePJeHTML(html, cleaned);
      result.tribunal = "TJRJ";
      return result;
    }
  }

  return {
    numeroProcesso: cleaned,
    erro: `Não foi possível consultar o tribunal ${info.tribunal}. O tribunal pode exigir captcha ou não ter consulta pública disponível.`,
    movimentos: [],
  };
}

function parsePJeSearchResults(html: string, cpf: string, tribunal: string): ScrapedCPFResult {
  const result: ScrapedCPFResult = { cpf, tribunal, processos: [] };

  const table = html.match(/<table[^>]*class="[^"]*rich-table[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  if (!table) {
    result.erro = "Tabela de resultados não encontrada";
    return result;
  }

  const rows = table[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/g);
  if (!rows || rows.length < 2) {
    result.erro = "Nenhum processo encontrado para este CPF";
    return result;
  }

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i].match(/<td[^>]*>([\s\S]*?)<\/td>/g);
    if (!cells || cells.length < 2) continue;

    const cellTexts = cells.map((c: string) => c.replace(/<[^>]+>/g, "").trim());

    const numero = cellTexts.find((t: string) => t.replace(/\D/g, "").length >= 15);
    if (numero) {
      result.processos.push({
        numero: numero.replace(/\s+/g, " ").trim(),
        classe: cellTexts[0] || undefined,
        parte: cellTexts[1] || undefined,
        ultimaMovimentacao: cellTexts[cellTexts.length - 1] !== cellTexts[0] ? cellTexts[cellTexts.length - 1] : undefined,
      });
    }
  }

  if (result.processos.length === 0) {
    result.erro = "Nenhum processo encontrado para este CPF";
  }

  return result;
}

function parseESAJPesquisaLivre(html: string, cpf: string): ScrapedCPFResult {
  const result: ScrapedCPFResult = { cpf, tribunal: "TJSP", processos: [] };

  const table = html.match(/<table[^>]*id="tabelaResultado"[^>]*>([\s\S]*?)<\/table>/i);
  if (!table) {
    result.erro = "Nenhum resultado encontrado no TJSP para este CPF";
    return result;
  }

  const rows = table[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/g);
  if (!rows || rows.length < 2) {
    result.erro = "Nenhum processo encontrado";
    return result;
  }

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i].match(/<td[^>]*>([\s\S]*?)<\/td>/g);
    if (!cells) continue;

    const cellTexts = cells.map((c: string) => c.replace(/<[^>]+>/g, "").trim());
    const processoLink = cells[0]?.match(/href="([^"]+)"/);
    const numeroMatch = cells[0]?.match(/(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/);

    if (numeroMatch) {
      result.processos.push({
        numero: numeroMatch[1],
        classe: cellTexts[1] || undefined,
        parte: cpf,
        ultimaMovimentacao: cellTexts[cellTexts.length - 1]?.replace(/\s+/g, " ").trim(),
      });
    }
  }

  if (result.processos.length === 0) {
    result.erro = "Nenhum processo encontrado para este CPF no TJSP";
  }

  return result;
}

const TRIBUNAIS_PRIORITARIOS = [
  { tr: "26", nome: "TJSP", tipo: "esaj" as const },
  { tr: "19", nome: "TJRJ", pje: "pje.tjrj.jus.br" },
  { tr: "13", nome: "TJMG", pje: "pje.tjmg.jus.br" },
  { tr: "16", nome: "TJPR", pje: "pje.tjpr.jus.br" },
  { tr: "21", nome: "TJRS", pje: "pje.tjrs.jus.br" },
  { tr: "08", nome: "TJES", pje: "pje.tjes.jus.br" },
  { tr: "09", nome: "TJGO", pje: "pje.tjgo.jus.br" },
  { tr: "05", nome: "TJBA", pje: "pje.tjba.jus.br" },
  { tr: "15", nome: "TJPB", pje: "pje.tjpb.jus.br" },
  { tr: "24", nome: "TJSC", pje: "eproc.tjsc.jus.br" },
];

function validarCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleaned)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cleaned[i]) * (10 - i);
  let rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  if (rest !== parseInt(cleaned[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cleaned[i]) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  return rest === parseInt(cleaned[10]);
}

export async function scraperBuscarPorCPF(cpf: string): Promise<ScrapedCPFResult[]> {
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length !== 11 || !validarCPF(cleaned)) {
    return [{ cpf, tribunal: "erro", processos: [], erro: "CPF inválido" }];
  }

  const cpfFormatado = `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
  const results: ScrapedCPFResult[] = [];

  const promises: Array<Promise<void>> = [];

  for (const trib of TRIBUNAIS_PRIORITARIOS) {
    if (trib.tipo === "esaj") {
      promises.push((async () => {
        try {
          const url = `https://esaj.tjsp.jus.br/cposg/search.do?conversationId=&dadosConsulta.pesquisaLivre=${encodeURIComponent(cpfFormatado)}&tipoNumero=UNIFICADO&dadosConsulta.tipoPesquisa=LIVRE`;
          let html = await extrairHTMLviaFetch(url);
          if (!html) html = await extrairViaPlaywright(url);
          if (html) {
            const result = parseESAJPesquisaLivre(html, cpfFormatado);
            if (result.processos.length > 0) results.push(result);
          }
        } catch {
          // silencia
        }
      })());
    } else if (trib.pje) {
      promises.push((async () => {
        try {
          const url = `https://${trib.pje}/pje/ConsultaPublica/listView.seam?parte=${encodeURIComponent(cpfFormatado)}`;
          let html = await extrairHTMLviaFetch(url);
          if (!html) html = await extrairViaPlaywright(url);
          if (html && /processos? encontrados?/i.test(html)) {
            const result = parsePJeSearchResults(html, cpfFormatado, trib.nome);
            if (result.processos.length > 0) results.push(result);
          }
        } catch {
          // silencia
        }
      })());
    }
  }

  await Promise.all(promises);

  if (results.length === 0) {
    results.push({
      cpf: cpfFormatado,
      tribunal: "todos",
      processos: [],
      erro: "Nenhum processo encontrado nos tribunais consultados. Pode ser necessário captcha ou o CPF pode não ter processos públicos.",
    });
  }

  return results;
}
