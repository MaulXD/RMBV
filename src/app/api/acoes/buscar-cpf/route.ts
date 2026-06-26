import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api";
import { teamScopeWhere } from "@/lib/team-access";
import { buscarProcessosPorCPF } from "@/lib/datajud";

export const runtime = "nodejs";

const schema = z.object({ clientId: z.string().uuid() });

export async function POST(request: Request) {
  return withAuth(async (user) => {
    if (!["ADMIN", "ADV", "GERENTE"].includes(user.role)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "clientId inválido" }, { status: 400 });
    }

    const client = await prisma.client.findFirst({
      where: { id: parsed.data.clientId, ...teamScopeWhere(user) },
      select: { id: true, name: true, cpf: true },
    });

    if (!client) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }

    if (!client.cpf) {
      return NextResponse.json({ error: "Cliente não possui CPF cadastrado" }, { status: 422 });
    }

    if (!process.env.DATAJUD_API_KEY) {
      return NextResponse.json({ error: "DATAJUD_API_KEY não configurada" }, { status: 503 });
    }

    const processos = await buscarProcessosPorCPF(client.cpf);

    const acaoExistentes = await prisma.acao.findMany({
      where: { clientId: client.id },
      select: { numProcesso: true, numCNJ: true },
    });
    const numerosExistentes = new Set([
      ...acaoExistentes.map((a) => a.numProcesso?.replace(/\D/g, "") ?? ""),
      ...acaoExistentes.map((a) => a.numCNJ?.replace(/\D/g, "") ?? ""),
    ]);

    const processosComStatus = processos.map((p) => ({
      ...p,
      jaImportado: numerosExistentes.has(p.numeroProcesso.replace(/\D/g, "")),
    }));

    return NextResponse.json({ processos: processosComStatus, clientName: client.name });
  });
}
