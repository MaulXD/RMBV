import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { scraperBuscarPorCPF } from "@/lib/scraper-courts";

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

    const results = await scraperBuscarPorCPF(cpf);
    const totalProcessos = results.reduce((sum, r) => sum + r.processos.length, 0);

    return NextResponse.json({ results, total: totalProcessos });
  });
}
