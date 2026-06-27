import { parse } from "node-html-parser";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export type PjeProcesso = {
  numeroProcesso: string;
  tribunal: string;
  classe?: string | null;
  assunto?: string | null;
  vara?: string | null;
  dataAjuizamento?: string | null;
};

export const PJE_COURTS: Record<string, { nome: string; url: string }> = {
  trf5: {
    nome: "TRF 5",
    url: "https://pje1g.trf5.jus.br/pjeconsulta/ConsultaPublica/listView.seam",
  },
};

// CNJ: NNNNNNN-DD.AAAA.J.TT.OOOO
const CNJ_RE = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/;

function isValidCnjNumber(num: string): boolean {
  const match = num.match(/\d{7}-\d{2}\.(\d{4})\.\d\.\d{2}\.\d{4}/);
  if (!match) return false;
  const year = parseInt(match[1], 10);
  return year >= 1984 && year <= 2035;
}

function extractCookies(res: Response): string {
  const raw = res.headers.get("set-cookie") ?? "";
  return raw
    .split(",")
    .map((c) => c.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
}

function mergeCookies(existing: string, fresh: string): string {
  const map = new Map<string, string>();
  for (const pair of [...existing.split("; "), ...fresh.split("; ")]) {
    const [k, ...rest] = pair.split("=");
    if (k?.trim()) map.set(k.trim(), rest.join("=").trim());
  }
  return Array.from(map.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

export async function debugPjeForm(tribunal: keyof typeof PJE_COURTS): Promise<{
  url: string;
  formAction: string | null;
  viewState: string | null;
  inputs: Array<{ name: string | null; id: string | null; type: string | null; value: string | null }>;
}> {
  const court = PJE_COURTS[tribunal];
  if (!court) throw new Error(`Tribunal ${tribunal} not configured`);

  const res = await fetch(court.url, {
    headers: { "User-Agent": UA, Accept: "text/html" },
    redirect: "follow",
  });

  const html = await res.text();
  const doc = parse(html);
  const form = doc.querySelector("form");
  const viewState = doc.querySelector('input[name="javax.faces.ViewState"]')?.getAttribute("value") ?? null;

  const inputs = doc.querySelectorAll("input, select").map((el) => ({
    name: el.getAttribute("name") ?? null,
    id: el.getAttribute("id") ?? null,
    type: el.getAttribute("type") ?? null,
    value: el.getAttribute("value") ?? null,
  }));

  return {
    url: court.url,
    formAction: form?.getAttribute("action") ?? null,
    viewState,
    inputs,
  };
}

async function fetchDetailProcessNumber(
  caHash: string,
  baseOrigin: string,
  cookies: string
): Promise<string | null> {
  const url = `${baseOrigin}/pjeconsulta/ConsultaPublica/DetalheProcessoConsultaPublica/listView.seam?ca=${caHash}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Cookie: cookies, Accept: "text/html" },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const html = await res.text();
    // Process number is in a prominent element on the detail page
    const doc = parse(html);
    const text = doc.text;
    const matches = text.match(new RegExp(CNJ_RE.source, "g")) ?? [];
    return matches.find((m) => isValidCnjNumber(m)) ?? null;
  } catch {
    return null;
  }
}

export async function searchCPFOnPJe(
  cpf: string,
  tribunal: keyof typeof PJE_COURTS
): Promise<PjeProcesso[]> {
  const court = PJE_COURTS[tribunal];
  if (!court) return [];

  // ── Step 1: GET page ────────────────────────────────────────────────────
  let cookies = "";
  let html = "";
  let initialUrl = court.url;

  try {
    const getRes = await fetch(court.url, {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
    });
    if (!getRes.ok) return [];
    initialUrl = getRes.url || court.url;
    cookies = extractCookies(getRes);
    html = await getRes.text();
  } catch {
    return [];
  }

  const doc = parse(html);
  const viewState = doc.querySelector('input[name="javax.faces.ViewState"]')?.getAttribute("value");
  if (!viewState) return [];

  // Form action preserving jsessionid in path
  const formEl = doc.querySelector("form#fPP") ?? doc.querySelector("form");
  const rawAction = formEl?.getAttribute("action") ?? "";
  const actionUrl = rawAction
    ? rawAction.startsWith("http") ? rawAction : new URL(rawAction, initialUrl).href
    : initialUrl;

  // ── Step 2: Find CPF TEXT input — skip radio/checkbox/hidden ────────────
  const cpfEl = doc.querySelectorAll("input").find((el) => {
    const type = (el.getAttribute("type") ?? "text").toLowerCase();
    if (type !== "text") return false;
    const id = (el.getAttribute("id") ?? "").toLowerCase();
    const name = (el.getAttribute("name") ?? "").toLowerCase();
    return (
      id.includes("cpf") || id.includes("documento") || id.includes("numdoc") ||
      name.includes("cpf") || name.includes("documento") || name.includes("numdoc")
    );
  });
  const cpfFieldName = cpfEl?.getAttribute("name") ?? cpfEl?.getAttribute("id");

  // ── Step 3: Extract A4J component ID from executarPesquisa JS ──────────
  // RichFaces 3.x (A4J) uses AJAXREQUEST + component self-param, NOT javax.faces.partial.*
  const execMatch = html.match(/executarPesquisa[\s\S]*?'similarityGroupingId'\s*:\s*'([^']+)'/);
  const ajaxComponentId = execMatch?.[1]; // e.g. "fPP:j_id224"

  // ── Step 4: Build POST body (A4J 3.x protocol) ──────────────────────────
  const body = new URLSearchParams();

  // A4J marker — tells the server this is a RichFaces AJAX request
  body.set("AJAXREQUEST", "fPP");
  if (ajaxComponentId) body.set(ajaxComponentId, ajaxComponentId);

  // Hidden fields from the fPP form
  formEl?.querySelectorAll('input[type="hidden"]').forEach((el) => {
    const name = el.getAttribute("name");
    const value = el.getAttribute("value") ?? "";
    if (name) body.set(name, value);
  });

  body.set("javax.faces.ViewState", viewState);

  // CPF field (formatted: 031.845.604-49)
  if (cpfFieldName) body.set(cpfFieldName, cpf);

  // ── Step 5: POST ─────────────────────────────────────────────────────────
  let resultHtml = "";
  try {
    const postRes = await fetch(actionUrl, {
      method: "POST",
      headers: {
        "User-Agent": UA,
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookies,
        Referer: initialUrl,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: body.toString(),
      redirect: "follow",
    });
    if (!postRes.ok) return [];
    const freshCookies = extractCookies(postRes);
    cookies = mergeCookies(cookies, freshCookies);
    resultHtml = await postRes.text();
  } catch {
    return [];
  }

  // ── Step 6: Extract `ca` hashes from openPopUp links in result table ─────
  // The list view does NOT show process numbers — they're only in the detail page.
  // Each row has: onclick="openPopUp('...', '...?ca=<hash>')"
  const caHashes: string[] = [];
  const onclickPattern = /openPopUp\([^)]*\?ca=([a-f0-9]+)/g;
  let m: RegExpExecArray | null;
  while ((m = onclickPattern.exec(resultHtml)) !== null) {
    if (!caHashes.includes(m[1])) caHashes.push(m[1]);
  }

  if (caHashes.length === 0) return [];

  // ── Step 7: Fetch detail pages to get actual CNJ process numbers ─────────
  const baseOrigin = new URL(initialUrl).origin;
  const results: PjeProcesso[] = [];
  const seen = new Set<string>();

  // Cap at 30 to avoid timeouts (a CPF typically has few processes)
  for (const ca of caHashes.slice(0, 30)) {
    const numero = await fetchDetailProcessNumber(ca, baseOrigin, cookies);
    if (numero && !seen.has(numero)) {
      seen.add(numero);
      results.push({ numeroProcesso: numero, tribunal });
    }
  }

  return results;
}

// Debug version — returns raw data for inspection
export async function searchCPFOnPJeDebug(
  cpf: string,
  tribunal: keyof typeof PJE_COURTS
): Promise<Record<string, unknown>> {
  const court = PJE_COURTS[tribunal];
  if (!court) throw new Error("Tribunal not configured");

  let cookies = "";
  let initialUrl = court.url;
  const getRes = await fetch(court.url, {
    headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
    redirect: "follow",
  });
  initialUrl = getRes.url || court.url;
  cookies = extractCookies(getRes);
  const html = await getRes.text();

  const doc = parse(html);
  const viewState = doc.querySelector('input[name="javax.faces.ViewState"]')?.getAttribute("value") ?? "";
  const formEl = doc.querySelector("form#fPP") ?? doc.querySelector("form");
  const rawAction = formEl?.getAttribute("action") ?? "";
  const actionUrl = rawAction
    ? rawAction.startsWith("http") ? rawAction : new URL(rawAction, initialUrl).href
    : initialUrl;

  const cpfEl = doc.querySelectorAll("input").find((el) => {
    const type = (el.getAttribute("type") ?? "text").toLowerCase();
    if (type !== "text") return false;
    const id = (el.getAttribute("id") ?? "").toLowerCase();
    const name = (el.getAttribute("name") ?? "").toLowerCase();
    return id.includes("cpf") || id.includes("documento") || id.includes("numdoc") ||
      name.includes("cpf") || name.includes("documento") || name.includes("numdoc");
  });
  const cpfFieldName = cpfEl?.getAttribute("name") ?? null;

  const execMatch = html.match(/executarPesquisa[\s\S]*?'similarityGroupingId'\s*:\s*'([^']+)'/);
  const ajaxComponentId = execMatch?.[1] ?? null;

  const body = new URLSearchParams();
  body.set("AJAXREQUEST", "fPP");
  if (ajaxComponentId) body.set(ajaxComponentId, ajaxComponentId);
  formEl?.querySelectorAll('input[type="hidden"]').forEach((el) => {
    const name = el.getAttribute("name");
    if (name) body.set(name, el.getAttribute("value") ?? "");
  });
  body.set("javax.faces.ViewState", viewState);
  const formatted = cpf.length === 11
    ? `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9, 11)}`
    : cpf;
  if (cpfFieldName) body.set(cpfFieldName, formatted);

  const postRes = await fetch(actionUrl, {
    method: "POST",
    headers: {
      "User-Agent": UA,
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookies,
      Referer: initialUrl,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: body.toString(),
    redirect: "follow",
  });

  const freshCookies = extractCookies(postRes);
  cookies = mergeCookies(cookies, freshCookies);
  const rawResponse = await postRes.text();

  const caHashes: string[] = [];
  const onclickPattern = /openPopUp\([^)]*\?ca=([a-f0-9]+)/g;
  let matchResult: RegExpExecArray | null;
  while ((matchResult = onclickPattern.exec(rawResponse)) !== null) {
    if (!caHashes.includes(matchResult[1])) caHashes.push(matchResult[1]);
  }

  // Fetch first detail page if any ca hashes found
  let firstDetailHtml = "";
  let firstDetailNumber = null;
  if (caHashes.length > 0) {
    const baseOrigin = new URL(initialUrl).origin;
    firstDetailNumber = await fetchDetailProcessNumber(caHashes[0], baseOrigin, cookies);
    const detailUrl = `${baseOrigin}/pjeconsulta/ConsultaPublica/DetalheProcessoConsultaPublica/listView.seam?ca=${caHashes[0]}`;
    const dr = await fetch(detailUrl, { headers: { "User-Agent": UA, Cookie: cookies }, redirect: "follow" });
    firstDetailHtml = (await dr.text()).slice(0, 3000);
  }

  return {
    cpfFieldName,
    ajaxComponentId,
    postUrl: actionUrl,
    postStatus: postRes.status,
    postContentType: postRes.headers.get("content-type"),
    rawResponseLength: rawResponse.length,
    rawResponseStart: rawResponse.slice(0, 3000),
    caHashesFound: caHashes.length,
    caHashes: caHashes.slice(0, 5),
    firstDetailNumber,
    firstDetailHtmlStart: firstDetailHtml,
  };
}
