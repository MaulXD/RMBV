import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { teamScopeWhere } from "@/lib/team-access";
import { buscarPorCPFnumTribunal, COMMON_TRIBUNAIS } from "@/lib/datajud";

export const runtime = "nodejs";

const schema = z.object({ clientId: z.string().uuid(), tribunais: z.array(z.string()).optional() });

const BATCH = 6;

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!["ADMIN", "ADV", "GERENTE"].includes(user.role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "clientId inválido" }, { status: 400 });

  const client = await prisma.client.findFirst({
    where: { id: parsed.data.clientId, ...teamScopeWhere(user) },
    select: { id: true, name: true, cpf: true },
  });

  if (!client) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  if (!client.cpf) return NextResponse.json({ error: "Cliente não possui CPF cadastrado" }, { status: 422 });
  if (!process.env.DATAJUD_API_KEY) return NextResponse.json({ error: "DATAJUD_API_KEY não configurada" }, { status: 503 });

  const cpf = client.cpf.replace(/\D/g, "");

  const acaoExistentes = await prisma.acao.findMany({
    where: { clientId: client.id },
    select: { numProcesso: true, numCNJ: true },
  });
  const numerosExistentes = new Set([
    ...acaoExistentes.map((a) => a.numProcesso?.replace(/\D/g, "") ?? ""),
    ...acaoExistentes.map((a) => a.numCNJ?.replace(/\D/g, "") ?? ""),
  ]);

  const tribunais = Array.isArray(parsed.data.tribunais) && parsed.data.tribunais.length > 0
    ? COMMON_TRIBUNAIS.filter((t) => parsed.data.tribunais!.includes(t))
    : COMMON_TRIBUNAIS;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try { controller.enqueue(encoder.encode(JSON.stringify(data) + "\n")); } catch { /* closed */ }
      };

      for (let i = 0; i < tribunais.length; i += BATCH) {
        const batch = tribunais.slice(i, i + BATCH);
        batch.forEach((t) => send({ type: "checking", tribunal: t }));

        const settled = await Promise.allSettled(batch.map((t) => buscarPorCPFnumTribunal(cpf, t)));
        settled.forEach((r, idx) => {
          if (r.status === "fulfilled" && r.value.length > 0) {
            const processos = r.value.map((p) => ({
              ...p,
              jaImportado: numerosExistentes.has(p.numeroProcesso.replace(/\D/g, "")),
            }));
            send({ type: "result", tribunal: batch[idx], processos });
          } else {
            send({ type: "checked", tribunal: batch[idx] });
          }
        });
      }

      send({ type: "done", clientName: client.name });
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
