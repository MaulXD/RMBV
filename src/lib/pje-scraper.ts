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

function extractCookies(res: Response): string {
  const raw = res.headers.get("set-cookie") ?? "";
  // keep only name=value pairs, strip attributes
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

  try {
    const getRes = await fetch(court.url, {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
    });
    if (!getRes.ok) return [];
    cookies = extractCookies(getRes);
    html = await getRes.text();
  } catch {
    return [];
  }

  const doc = parse(html);

  // ViewState (mandatory for JSF)
  const viewState = doc.querySelector('input[name="javax.faces.ViewState"]')?.getAttribute("value");
  if (!viewState) return [];

  // Form action
  const formEl = doc.querySelector("form");
  const rawAction = formEl?.getAttribute("action") ?? "";
  const actionUrl = rawAction
    ? rawAction.startsWith("http")
      ? rawAction
      : new URL(rawAction, court.url).href
    : court.url;

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

  // ── Step 3: Build POST body ──────────────────────────────────────────────
  const body = new URLSearchParams();

  // Carry all hidden fields (ViewState + JSF internals)
  doc.querySelectorAll('input[type="hidden"]').forEach((el) => {
    const name = el.getAttribute("name");
    const value = el.getAttribute("value") ?? "";
    if (name) body.append(name, value);
  });

  // Override ViewState explicitly
  body.set("javax.faces.ViewState", viewState);

  // CPF field
  if (cpfFieldName) {
    body.set(cpfFieldName, cpf);
  }

  // Try to trigger the search button (JSF needs to know which component submitted)
  const submitBtn =
    doc.querySelector('input[type="submit"]') ||
    doc.querySelector('button[type="submit"]') ||
    doc.querySelector('input[id*="buscar" i]') ||
    doc.querySelector('input[id*="pesquisar" i]') ||
    doc.querySelector('button[id*="buscar" i]');
  const btnName = submitBtn?.getAttribute("name");
  if (btnName) body.set(btnName, submitBtn?.getAttribute("value") ?? "Pesquisar");

  // ── Step 4: POST ─────────────────────────────────────────────────────────
  let resultHtml = "";
  try {
    const postRes = await fetch(actionUrl, {
      method: "POST",
      headers: {
        "User-Agent": UA,
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookies,
        Referer: court.url,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      body: body.toString(),
      redirect: "follow",
    });

    if (!postRes.ok) return [];
    const freshCookies = extractCookies(postRes);
    cookies = mergeCookies(cookies, freshCookies);
    const contentType = postRes.headers.get("content-type") ?? "";
    const rawResult = await postRes.text();

    // JSF AJAX response (partial-response XML)
    if (contentType.includes("xml") || rawResult.trimStart().startsWith("<?xml")) {
      // Extract HTML fragments from CDATA sections in partial-response
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
      const numero = texts.find((t) => CNJ_RE.test(t));
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

  // Strategy 2: scan all text nodes for CNJ numbers (catches non-table layouts)
  if (results.length === 0) {
    const all = doc.text;
    const matches = all.match(new RegExp(CNJ_RE.source, "g")) ?? [];
    for (const m of matches) {
      if (!found.has(m)) {
        found.add(m);
        results.push({ numeroProcesso: m, tribunal });
      }
    }
  }

  return results;
}
