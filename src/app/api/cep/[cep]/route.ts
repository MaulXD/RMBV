import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ cep: string }> },
) {
  const { cep } = await params;
  const cleaned = cep.replace(/\D/g, "");
  if (cleaned.length !== 8) {
    return NextResponse.json({ error: "CEP inválido" }, { status: 400 });
  }

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return NextResponse.json({ error: "CEP não encontrado" }, { status: 404 });
    const data = await res.json() as Record<string, unknown>;
    if (data.erro) return NextResponse.json({ error: "CEP não encontrado" }, { status: 404 });
    return NextResponse.json({
      cep: data.cep,
      logradouro: data.logradouro,
      complemento: data.complemento,
      bairro: data.bairro,
      cidade: data.localidade,
      uf: data.uf,
    });
  } catch {
    return NextResponse.json({ error: "Erro ao consultar CEP" }, { status: 502 });
  }
}
