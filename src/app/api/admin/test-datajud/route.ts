import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

const API_BASE = "https://api-publica.datajud.cnj.jus.br";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({})) as { cpf?: string; tribunal?: string };
  const cpf = (body.cpf ?? "").replace(/\D/g, "");
  const tribunal = body.tribunal ?? "trf5";

  if (!cpf || cpf.length !== 11) {
    return NextResponse.json({ error: "CPF com 11 dígitos obrigatório" }, { status: 400 });
  }

  const key = process.env.DATAJUD_API_KEY;
  if (!key) return NextResponse.json({ error: "DATAJUD_API_KEY não configurada" }, { status: 503 });

  const url = `${API_BASE}/api_publica_${tribunal}/_search`;

  // Try 3 query strategies in parallel
  const queries = {
    nested_term: {
      query: {
        nested: {
          path: "partes",
          query: { term: { "partes.documento": cpf } },
        },
      },
      size: 5,
      _source: ["numeroProcesso", "classe", "assunto", "orgaoJulgador", "dataAjuizamento", "partes"],
    },
    nested_match: {
      query: {
        nested: {
          path: "partes",
          query: { match: { "partes.documento": cpf } },
        },
      },
      size: 5,
      _source: ["numeroProcesso", "classe", "assunto", "orgaoJulgador", "dataAjuizamento", "partes"],
    },
    flat_term: {
      query: {
        bool: {
          should: [
            { term: { "partes.documento": cpf } },
            { match: { "partes.documento": cpf } },
          ],
          minimum_should_match: 1,
        },
      },
      size: 5,
      _source: ["numeroProcesso", "classe", "assunto", "orgaoJulgador", "dataAjuizamento", "partes"],
    },
  };

  const headers = { Authorization: `APIKey ${key}`, "Content-Type": "application/json" };

  const results = await Promise.all(
    Object.entries(queries).map(async ([name, q]) => {
      try {
        const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(q) });
        const data = await res.json();
        return {
          strategy: name,
          status: res.status,
          total: data?.hits?.total?.value ?? data?.hits?.total ?? 0,
          hits: (data?.hits?.hits ?? []).length,
          firstHit: data?.hits?.hits?.[0]?._source ?? null,
          error: data?.error ?? null,
        };
      } catch (err) {
        return { strategy: name, error: String(err) };
      }
    })
  );

  // Also test a simple ping (no filter) to confirm the index exists and API key works
  let ping: { status: number; indexTotal?: number; error?: string } = { status: 0 };
  try {
    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify({ query: { match_all: {} }, size: 1 }) });
    const data = await res.json();
    ping = {
      status: res.status,
      indexTotal: data?.hits?.total?.value ?? data?.hits?.total ?? 0,
    };
  } catch (err) {
    ping = { status: 0, error: String(err) };
  }

  return NextResponse.json({ tribunal, cpf, ping, results });
}
