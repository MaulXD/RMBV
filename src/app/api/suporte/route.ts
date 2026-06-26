import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { sendPushToTokens } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const suporteSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  sala: z.string().min(1, "Sala é obrigatória"),
  necessidade: z.string().min(1, "Necessidade é obrigatória"),
  outroTexto: z.string().optional().nullable(),
  obs: z.string().optional().nullable(),
});

async function forwardToSheet(data: Record<string, unknown>) {
  const url = process.env.SUPORTE_SHEET_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch {
    // falha no webhook não deve quebrar a solicitação
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = suporteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const user = await getSessionUser().catch(() => null);

    const LUCIANO_ID = "34e83151-fd09-45de-a6c5-714f2ba1232d";

    const request_ = await prisma.supportRequest.create({
      data: {
        name: data.name,
        sala: data.sala,
        necessidade: data.necessidade === "Outro" && data.outroTexto ? data.outroTexto : data.necessidade,
        outroTexto: data.outroTexto,
        obs: data.obs,
        email: user?.email ?? null,
        requesterId: user?.id ?? null,
        assignedToId: LUCIANO_ID,
      },
    });

    const notifyUsers = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "TI"] }, isActive: true },
      select: { id: true, pushTokens: true },
    });

    for (const admin of notifyUsers) {
      await createNotification(prisma, {
        userId: admin.id,
        type: "GENERAL",
        title: "Nova solicitação de suporte",
        body: `${data.name} (Sala ${data.sala}): ${data.necessidade}`,
        href: "/ti/chamados",
      });
    }

    const allTokens = notifyUsers.flatMap((u) => (u.pushTokens as string[]) ?? []);
    if (allTokens.length > 0) {
      const result = await sendPushToTokens(allTokens, {
        title: "Nova solicitação de suporte",
        body: `${data.name} (Sala ${data.sala}): ${data.necessidade}`,
        data: { href: "/ti/chamados" },
      });

      if (result && result.failedTokens.length > 0) {
        const failed = new Set(result.failedTokens);
        for (const user of notifyUsers) {
          const tokens: string[] = (user.pushTokens as string[]) ?? [];
          const filtered = tokens.filter((t) => !failed.has(t));
          if (filtered.length !== tokens.length) {
            await prisma.user.update({
              where: { id: user.id },
              data: { pushTokens: filtered },
            });
          }
        }
      }
    }

    const payload = {
      name: data.name,
      sala: data.sala,
      necessidade: data.necessidade,
      outroTexto: data.outroTexto,
      obs: data.obs,
      requesterId: user?.id ?? null,
      email: user?.email ?? null,
    };

    void forwardToSheet(payload);

    // WhatsApp lead forwarding
    const whatsappUrl = process.env.SUPORTE_WHATSAPP_WEBHOOK_URL;
    if (whatsappUrl) {
      void fetch(whatsappUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, type: "lead", source: "suporte-ti" }),
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, id: request_.id });
  } catch (err) {
    console.error("Erro ao criar solicitação de suporte:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
