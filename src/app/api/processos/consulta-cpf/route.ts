import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { buscarPorCPFnumTribunal, COMMON_TRIBUNAIS } from "@/lib/datajud";

export const runtime = "nodejs";

const BATCH = 6;

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!["ADMIN", "ADV", "GERENTE"].includes(user.role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const cpf = ((body.cpf as string) || "").replace(/\D/g, "");

  if (cpf.length !== 11) {
    return NextResponse.json({ error: "CPF inválido" }, { status: 400 });
  }

  if (!process.env.DATAJUD_API_KEY) {
    return NextResponse.json({ error: "DATAJUD_API_KEY não configurada no servidor" }, { status: 503 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try { controller.enqueue(encoder.encode(JSON.stringify(data) + "\n")); } catch { /* closed */ }
      };

      for (let i = 0; i < COMMON_TRIBUNAIS.length; i += BATCH) {
        const batch = COMMON_TRIBUNAIS.slice(i, i + BATCH);
        batch.forEach((t) => send({ type: "checking", tribunal: t }));

        const settled = await Promise.allSettled(batch.map((t) => buscarPorCPFnumTribunal(cpf, t)));
        settled.forEach((r, idx) => {
          if (r.status === "fulfilled" && r.value.length > 0) {
            send({ type: "result", tribunal: batch[idx], processos: r.value });
          }
        });
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
