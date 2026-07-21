import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getClientIfAllowed } from "@/lib/client-access";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    const { id } = await params;

    const client = await getClientIfAllowed(id, user);
    if (!client) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }

    const history = await prisma.clientHistory.findMany({
      where: { clientId: id },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        createdBy: { select: { name: true } },
      },
    });

    const historyText = history
      .map((h) => {
        const date = new Date(h.createdAt).toLocaleDateString("pt-BR");
        const author = h.createdBy?.name ?? "Sistema";
        return `- [${date}] ${author}: ${h.note ?? ""}`;
      })
      .join("\n");

    const followUp = client.followUpAt
      ? new Date(client.followUpAt).toLocaleDateString("pt-BR")
      : "não definido";

    const prompt = `Você é um assistente jurídico especializado em análise de clientes. Analise as informações abaixo e gere um resumo conciso em português do perfil do cliente e do histórico de interações recentes.

Nome: ${client.name}
Status: ${client.status ?? "não informado"}
Retorno agendado: ${followUp}

Histórico recente (do mais recente ao mais antigo):
${historyText || "Nenhuma interação registrada."}

Gere um parágrafo ou dois com:
1. Situação atual do cliente
2. Pontos de atenção ou próximos passos relevantes

Seja objetivo e use linguagem profissional.`;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Chave da API de IA não configurada" },
        { status: 500 }
      );
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Anthropic API error:", err);
      return NextResponse.json(
        { error: "Erro ao chamar a API de IA" },
        { status: 502 }
      );
    }

    const data = await response.json();
    const summary: string = data.content?.[0]?.text ?? "";

    return NextResponse.json({ summary });
  });
}
