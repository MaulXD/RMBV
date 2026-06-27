import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { searchCPFOnPJe, PJE_COURTS } from "@/lib/pje-scraper";

export const runtime = "nodejs";
// PJe can be slow — give it more time
export const maxDuration = 60;

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!["ADMIN", "ADV", "GERENTE"].includes(user.role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({})) as { cpf?: string; tribunais?: string[] };
  const cpf = (body.cpf ?? "").replace(/\D/g, "");
  const formatted = cpf.length === 11
    ? `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9, 11)}`
    : cpf;

  if (cpf.length !== 11) {
    return NextResponse.json({ error: "CPF inválido" }, { status: 400 });
  }

  const requestedTribunais = Array.isArray(body.tribunais) && body.tribunais.length > 0
    ? body.tribunais.filter((t) => t in PJE_COURTS)
    : Object.keys(PJE_COURTS);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try { controller.enqueue(encoder.encode(JSON.stringify(data) + "\n")); } catch { /* closed */ }
      };

      for (const tribunal of requestedTribunais) {
        send({ type: "checking", tribunal });
        try {
          // Try both formatted and raw CPF
          const results = await searchCPFOnPJe(formatted, tribunal as keyof typeof PJE_COURTS);
          if (results.length > 0) {
            send({ type: "result", tribunal, processos: results });
          } else {
            send({ type: "checked", tribunal });
          }
        } catch {
          send({ type: "checked", tribunal });
        }
      }

      send({ type: "done" });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
