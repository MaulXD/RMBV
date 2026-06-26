import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { buscarProcessosPorCPF } from "@/lib/datajud";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return withAuth(async (user) => {
    if (!["ADMIN", "ADV", "GERENTE"].includes(user.role)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const cpf = (body.cpf || "").replace(/\D/g, "");

    if (cpf.length !== 11) {
      return NextResponse.json({ error: "CPF inválido" }, { status: 400 });
    }

    if (!process.env.DATAJUD_API_KEY) {
      return NextResponse.json({ error: "DATAJUD_API_KEY não configurada no servidor" }, { status: 503 });
    }

    const processos = await buscarProcessosPorCPF(cpf);

    // Group by tribunal to match the UI expected format
    const byTribunal = new Map<string, Array<{ numero: string; classe?: string; ultimaMovimentacao?: string }>>();
    for (const p of processos) {
      const trib = p.tribunal || "Desconhecido";
      if (!byTribunal.has(trib)) byTribunal.set(trib, []);
      byTribunal.get(trib)!.push({
        numero: p.numeroProcesso,
        classe: p.classe ?? undefined,
        ultimaMovimentacao: p.dataAjuizamento ?? undefined,
      });
    }

    const results = Array.from(byTribunal.entries()).map(([tribunal, ps]) => ({
      tribunal,
      processos: ps,
    }));

    return NextResponse.json({ results, total: processos.length });
  });
}
