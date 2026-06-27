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

// Court configs — only those without CAPTCHA on public consultation
export const PJE_COURTS: Record<string, { nome: string; url: string }> = {
  trf5: {
    nome: "TRF 5",
    // pje1g = PJe v1 — no CAPTCHA on ConsultaPublica
    url: "https://pje1g.trf5.jus.br/pjeconsulta/ConsultaPublica/listView.seam",
  },
};

// CNJ process number pattern: 0000000-00.0000.0.00.0000
const CNJ_RE = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/;

function isValidCnjNumber(num: string): boolean {
  // Format: NNNNNNN-DD.AAAA.J.TT.OOOO — filter placeholder rows (year=9999 etc.)
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

export async function searchCPFOnPJe(
  cpf: string,
  tribunal: keyof typeof PJE_COURTS
): Promise<PjeProcesso[]> {
  const court = PJE_COURTS[tribunal];
  if (!court) return [];

  // ── Step 1: GET the page — collect cookies + ViewState ──────────────────
  let cookies = "";
  let html = "";
  let initialUrl = court.url;

  try {
    const getRes = await fetch(court.url, {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
    });
    if (!getRes.ok) return [];
    // Capture final URL after redirects (has jsessionid in path)
    initialUrl = getRes.url || court.url;
    cookies = extractCookies(getRes);
    html = await getRes.text();
  } catch {
    return [];
  }

  const doc = parse(html);

  // ViewState (mandatory for JSF)
  const viewState = doc.querySelector('input[name="javax.faces.ViewState"]')?.getAttribute("value");
  if (!viewState) return [];

  // Form action — must keep jsessionid path parameter
  const formEl = doc.querySelector("form");
  const rawAction = formEl?.getAttribute("action") ?? "";
  const actionUrl = rawAction
    ? rawAction.startsWith("http")
      ? rawAction
      : new URL(rawAction, initialUrl).href
    : initialUrl;

  // ── Step 2: find CPF input dynamically ─────────────────────────────────
  const allInputs = doc.querySelectorAll("input, select");
  const cpfEl = allInputs.find((el) => {
    const id = (el.getAttribute("id") ?? "").toLowerCase();
    const name = (el.getAttribute("name") ?? "").toLowerCase();
    return (
      id.includes("cpf") ||
      id.includes("documento") ||
      id.includes("numdoc") ||
      name.includes("cpf") ||
      name.includes("documento") ||
      name.includes("numdoc")
    );
  });
  const cpfFieldName = cpfEl?.getAttribute("name") ?? cpfEl?.getAttribute("id");

  // ── Find search button (JSF uses type="button" for AJAX actions) ────────
  const allButtons = doc.querySelectorAll("input, button");
  const submitBtn = allButtons.find((el) => {
    const type = el.getAttribute("type") ?? "";
    if (type === "submit") return true;
    const id = (el.getAttribute("id") ?? "").toLowerCase();
    const name = (el.getAttribute("name") ?? "").toLowerCase();
    const value = (el.getAttribute("value") ?? "").toLowerCase();
    return (
      id.includes("buscar") || id.includes("pesquisar") || id.includes("search") ||
      name.includes("buscar") || name.includes("pesquisar") || name.includes("search") ||
      value.includes("buscar") || value.includes("pesquisar") || value.includes("search")
    );
  });

  const btnName = submitBtn?.getAttribute("name");
  const btnValue = submitBtn?.getAttribute("value") ?? "Pesquisar";
  // PJe uses type="button" for JSF AJAX partial requests
  const isJsfAjax = (submitBtn?.getAttribute("type") ?? "") === "button";

  // ── Step 3: Build POST body ──────────────────────────────────────────────
  const body = new URLSearchParams();

  // JSF AJAX partial-request parameters (required when button is type="button")
  if (isJsfAjax && btnName) {
    body.set("javax.faces.partial.ajax", "true");
    body.set("javax.faces.source", btnName);
    body.set("javax.faces.partial.execute", "@form");
    body.set("javax.faces.partial.render", "@form");
    body.set(btnName, btnValue);
  }

  // Carry all hidden fields (ViewState + JSF internals)
  doc.querySelectorAll('input[type="hidden"]').forEach((el) => {
    const name = el.getAttribute("name");
    const value = el.getAttribute("value") ?? "";
    if (name) body.set(name, value);
  });

  // Override ViewState explicitly (dedup from hidden fields)
  body.set("javax.faces.ViewState", viewState);

  // For non-AJAX: include button in body the standard way
  if (!isJsfAjax && btnName) {
    body.set(btnName, btnValue);
  }

  // CPF field
  if (cpfFieldName) {
    body.set(cpfFieldName, cpf);
  }

  // ── Step 4: POST ─────────────────────────────────────────────────────────
  let resultHtml = "";
  try {
    const postHeaders: Record<string, string> = {
      "User-Agent": UA,
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookies,
      Referer: initialUrl,
    };

    if (isJsfAjax) {
      // JSF AJAX expects XML partial-response
      postHeaders["Accept"] = "application/xml, text/xml, */*; q=0.01";
      postHeaders["X-Requested-With"] = "XMLHttpRequest";
      postHeaders["Faces-Request"] = "partial/ajax";
    } else {
      postHeaders["Accept"] = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
    }

    const postRes = await fetch(actionUrl, {
      method: "POST",
      headers: postHeaders,
      body: body.toString(),
      redirect: "follow",
    });

    if (!postRes.ok) return [];
    const freshCookies = extractCookies(postRes);
    cookies = mergeCookies(cookies, freshCookies);
    const contentType = postRes.headers.get("content-type") ?? "";
    const rawResult = await postRes.text();

    // JSF partial-response XML: extract HTML from CDATA sections
    if (contentType.includes("xml") || rawResult.trimStart().startsWith("<?xml")) {
      const cdataMatches = rawResult.match(/<!\[CDATA\[([\s\S]*?)\]\]>/g) ?? [];
      resultHtml = cdataMatches.map((m) => m.replace(/<!\[CDATA\[/, "").replace(/\]\]>/, "")).join("\n");
    } else {
      resultHtml = rawResult;
    }
  } catch {
    return [];
  }

  return parseHtmlForProcessos(resultHtml, tribunal);
}

function parseHtmlForProcessos(html: string, tribunal: string): PjeProcesso[] {
  if (!html) return [];

  const doc = parse(html);
  const found = new Set<string>();
  const results: PjeProcesso[] = [];

  // Strategy 1: look for table rows containing CNJ process numbers
  const tables = doc.querySelectorAll("table");
  for (const table of tables) {
    const rows = table.querySelectorAll("tr");
    for (const row of rows) {
      const cells = row.querySelectorAll("td");
      if (cells.length < 2) continue;
      const texts = cells.map((c) => c.text.trim());
      const numero = texts.find((t) => CNJ_RE.test(t) && isValidCnjNumber(t));
      if (numero && !found.has(numero)) {
        found.add(numero);
        results.push({
          numeroProcesso: numero,
          tribunal,
          classe: texts[1] || null,
          assunto: texts[2] || null,
          vara: texts[3] || null,
        });
      }
    }
  }

  // Strategy 2: scan all text for CNJ numbers (catches non-table layouts)
  if (results.length === 0) {
    const all = doc.text;
    const matches = all.match(new RegExp(CNJ_RE.source, "g")) ?? [];
    for (const m of matches) {
      if (!found.has(m) && isValidCnjNumber(m)) {
        found.add(m);
        results.push({ numeroProcesso: m, tribunal });
      }
    }
  }

  return results;
}

// Debug version — returns raw response for inspection
export async function searchCPFOnPJeDebug(
  cpf: string,
  tribunal: keyof typeof PJE_COURTS
): Promise<{ cpfFieldName: string | null; btnName: string | null; isJsfAjax: boolean; rawResponse: string; parsedProcessos: PjeProcesso[] }> {
  const court = PJE_COURTS[tribunal];
  if (!court) throw new Error("Tribunal not configured");

  let cookies = "";
  let html = "";
  let initialUrl = court.url;

  const getRes = await fetch(court.url, {
    headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
    redirect: "follow",
  });
  initialUrl = getRes.url || court.url;
  cookies = extractCookies(getRes);
  html = await getRes.text();

  const doc = parse(html);
  const viewState = doc.querySelector('input[name="javax.faces.ViewState"]')?.getAttribute("value") ?? "";
  const formEl = doc.querySelector("form");
  const rawAction = formEl?.getAttribute("action") ?? "";
  const actionUrl = rawAction
    ? rawAction.startsWith("http") ? rawAction : new URL(rawAction, initialUrl).href
    : initialUrl;

  const allInputs = doc.querySelectorAll("input, select");
  const cpfEl = allInputs.find((el) => {
    const id = (el.getAttribute("id") ?? "").toLowerCase();
    const name = (el.getAttribute("name") ?? "").toLowerCase();
    return id.includes("cpf") || id.includes("documento") || id.includes("numdoc") ||
      name.includes("cpf") || name.includes("documento") || name.includes("numdoc");
  });
  const cpfFieldName = cpfEl?.getAttribute("name") ?? cpfEl?.getAttribute("id") ?? null;

  const allButtons = doc.querySelectorAll("input, button");
  const submitBtn = allButtons.find((el) => {
    const type = el.getAttribute("type") ?? "";
    if (type === "submit") return true;
    const id = (el.getAttribute("id") ?? "").toLowerCase();
    const name = (el.getAttribute("name") ?? "").toLowerCase();
    const value = (el.getAttribute("value") ?? "").toLowerCase();
    return id.includes("buscar") || id.includes("pesquisar") || id.includes("search") ||
      name.includes("buscar") || name.includes("pesquisar") || name.includes("search") ||
      value.includes("buscar") || value.includes("pesquisar") || value.includes("search");
  });
  const btnName = submitBtn?.getAttribute("name") ?? null;
  const btnValue = submitBtn?.getAttribute("value") ?? "Pesquisar";
  const isJsfAjax = (submitBtn?.getAttribute("type") ?? "") === "button";

  const body = new URLSearchParams();
  if (isJsfAjax && btnName) {
    body.set("javax.faces.partial.ajax", "true");
    body.set("javax.faces.source", btnName);
    body.set("javax.faces.partial.execute", "@form");
    body.set("javax.faces.partial.render", "@form");
    body.set(btnName, btnValue);
  }
  doc.querySelectorAll('input[type="hidden"]').forEach((el) => {
    const name = el.getAttribute("name");
    const value = el.getAttribute("value") ?? "";
    if (name) body.set(name, value);
  });
  body.set("javax.faces.ViewState", viewState);
  if (!isJsfAjax && btnName) body.set(btnName, btnValue);
  const formatted = cpf.length === 11
    ? `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9, 11)}`
    : cpf;
  if (cpfFieldName) body.set(cpfFieldName, formatted);

  const postHeaders: Record<string, string> = {
    "User-Agent": UA,
    "Content-Type": "application/x-www-form-urlencoded",
    Cookie: cookies,
    Referer: initialUrl,
  };
  if (isJsfAjax) {
    postHeaders["Accept"] = "application/xml, text/xml, */*; q=0.01";
    postHeaders["X-Requested-With"] = "XMLHttpRequest";
    postHeaders["Faces-Request"] = "partial/ajax";
  }

  const postRes = await fetch(actionUrl, {
    method: "POST",
    headers: postHeaders,
    body: body.toString(),
    redirect: "follow",
  });

  const rawResponse = await postRes.text();
  const parsedProcessos = parseHtmlForProcessos(rawResponse, tribunal);

  return { cpfFieldName, btnName, isJsfAjax, rawResponse, parsedProcessos };
}
