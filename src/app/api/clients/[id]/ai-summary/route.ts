import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getClientIfAllowed } from "@/lib/client-access";

export const runtime = "nodejs";

const STATUS_LABEL: Record<string, string> = {
  AGUARDANDO: "aguardando contato",
  LOCALIZADO: "localizado",
  SEM_SUCESSO: "sem sucesso nos contatos",
  TENTE_NOVAMENTE: "para tentar novamente",
};

const TYPE_LABEL: Record<string, string> = {
  CALL: "ligação",
  WHATSAPP: "mensagem via WhatsApp",
  EMAIL: "e-mail",
  NOTE: "anotação",
  STATUS_CHANGE: "mudança de status",
  PHONE_CHECK: "verificação de telefone",
  PESQUISA_UPDATED: "atualização de pesquisa",
};

function ptDate(d: Date) {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function daysDiff(a: Date, b: Date) {
  return Math.round(Math.abs(a.getTime() - b.getTime()) / 86_400_000);
}

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
      take: 50,
      include: { createdBy: { select: { name: true } } },
    });

    const now = new Date();

    // ── Contagens por tipo ──────────────────────────────────────────────────
    const counts: Record<string, number> = {};
    for (const h of history) {
      counts[h.type] = (counts[h.type] ?? 0) + 1;
    }

    const totalInteractions = history.length;
    const lastEntry = history[0];
    const firstEntry = history[history.length - 1];

    // ── Última interação relevante (não mudança de status) ──────────────────
    const lastContact = history.find(
      (h) => h.type === "CALL" || h.type === "WHATSAPP" || h.type === "EMAIL"
    );

    // ── Última nota ────────────────────────────────────────────────────────
    const lastNote = history.find((h) => h.type === "NOTE" && h.note?.trim());

    // ── Status atual ───────────────────────────────────────────────────────
    const statusLabel = STATUS_LABEL[client.status] ?? client.status;

    // ── Retorno agendado ───────────────────────────────────────────────────
    const followUp = client.followUpAt ? new Date(client.followUpAt) : null;
    const followUpStr = followUp ? ptDate(followUp) : null;
    const followUpOverdue = followUp && followUp < now;
    const followUpDays = followUp ? daysDiff(now, followUp) : null;

    // ── Monta o resumo ────────────────────────────────────────────────────
    const lines: string[] = [];

    // Parágrafo 1 — situação atual
    {
      const p: string[] = [];
      p.push(`${client.name} está atualmente com status ${statusLabel}.`);

      if (totalInteractions === 0) {
        p.push("Nenhuma interação foi registrada até o momento.");
      } else {
        const since = firstEntry
          ? ` desde ${ptDate(new Date(firstEntry.createdAt))}`
          : "";
        p.push(
          `Foram registradas ${totalInteractions} interação${totalInteractions > 1 ? "ões" : ""}${since}.`
        );
      }

      if (lastContact) {
        const typeStr = TYPE_LABEL[lastContact.type] ?? lastContact.type;
        const daysAgo = daysDiff(now, new Date(lastContact.createdAt));
        const who = lastContact.createdBy?.name;
        p.push(
          `O último contato foi uma ${typeStr}${who ? ` por ${who}` : ""}, há ${daysAgo === 0 ? "menos de 1 dia" : `${daysAgo} dia${daysAgo > 1 ? "s" : ""}`}.`
        );
      } else if (totalInteractions > 0 && lastEntry) {
        const daysAgo = daysDiff(now, new Date(lastEntry.createdAt));
        p.push(
          `A última movimentação foi há ${daysAgo === 0 ? "menos de 1 dia" : `${daysAgo} dia${daysAgo > 1 ? "s" : ""}`}.`
        );
      }

      lines.push(p.join(" "));
    }

    // Parágrafo 2 — pontos de atenção
    {
      const p: string[] = [];

      if (followUpStr) {
        if (followUpOverdue) {
          p.push(
            `Atenção: o retorno agendado para ${followUpStr} está em atraso — o cliente aguarda contato.`
          );
        } else {
          p.push(
            `Retorno programado para ${followUpStr} (em ${followUpDays} dia${followUpDays !== 1 ? "s" : ""}).`
          );
        }
      }

      const breakdown: string[] = [];
      if (counts["CALL"]) breakdown.push(`${counts["CALL"]} ligação${counts["CALL"] > 1 ? "ões" : ""}`);
      if (counts["WHATSAPP"]) breakdown.push(`${counts["WHATSAPP"]} mensagem${counts["WHATSAPP"] > 1 ? "ns" : ""} de WhatsApp`);
      if (counts["EMAIL"]) breakdown.push(`${counts["EMAIL"]} e-mail${counts["EMAIL"] > 1 ? "s" : ""}`);
      if (counts["NOTE"]) breakdown.push(`${counts["NOTE"]} anotação${counts["NOTE"] > 1 ? "ões" : ""}`);

      if (breakdown.length > 0) {
        p.push(`Histórico inclui: ${breakdown.join(", ")}.`);
      }

      if (lastNote?.note) {
        const snippet = lastNote.note.length > 120
          ? lastNote.note.slice(0, 120).trimEnd() + "…"
          : lastNote.note;
        p.push(`Última anotação: "${snippet}"`);
      }

      if (client.status === "SEM_SUCESSO") {
        p.push("Recomenda-se revisar os dados de contato antes de novas tentativas.");
      } else if (client.status === "AGUARDANDO" && !lastContact) {
        p.push("Nenhum contato direto foi realizado ainda — indicado iniciar abordagem.");
      } else if (client.status === "LOCALIZADO") {
        p.push("Cliente localizado — verificar andamento do processo junto à equipe responsável.");
      }

      if (p.length > 0) lines.push(p.join(" "));
    }

    const summary = lines.join("\n\n");

    return NextResponse.json({ summary });
  });
}
