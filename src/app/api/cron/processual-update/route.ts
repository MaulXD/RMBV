import { NextResponse } from "next/server";
import { agendarConsultasPendentes } from "@/lib/acao-processual";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 503 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const results = await agendarConsultasPendentes();
    const ok = results.filter((r) => r.ok).length;
    const erros = results.filter((r) => !r.ok).length;

    return NextResponse.json({
      ok: true,
      consultadas: results.length,
      sucesso: ok,
      erros,
      detalhes: results.filter((r) => !r.ok).map((r) => ({ acaoId: r.acaoId, erro: r.erro })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro no cron processual" },
      { status: 500 },
    );
  }
}
