import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const PHONE_FIELDS = [
  "phone1",
  "phone2",
  "phone3",
  "phone4",
  "phone5",
  "phone6",
  "phone7",
  "phone8",
  "phone9",
  "phone10",
] as const;

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  const withoutCountry =
    digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;
  return withoutCountry.slice(-11);
}

export async function POST(request: Request) {
  return withAuth(async (user) => {
    if (!user.teamId) {
      return NextResponse.json({ error: "Usuário sem equipe" }, { status: 400 });
    }

    const body = await request.json();
    const { clientId, message } = body as {
      clientId?: string;
      message?: string;
    };

    if (!clientId || !message?.trim()) {
      return NextResponse.json(
        { error: "clientId e message são obrigatórios" },
        { status: 400 }
      );
    }

    const config = await prisma.whatsAppConfig.findUnique({
      where: { teamId: user.teamId },
    });

    if (!config || !config.isActive) {
      return NextResponse.json(
        { error: "WhatsApp não configurado" },
        { status: 400 }
      );
    }

    const teamFilter =
      user.role === "ADMIN" || user.role === "TI"
        ? {}
        : { teamId: user.teamId };

    const client = await prisma.client.findFirst({
      where: { id: clientId, ...teamFilter },
      select: {
        id: true,
        phone1: true,
        phone2: true,
        phone3: true,
        phone4: true,
        phone5: true,
        phone6: true,
        phone7: true,
        phone8: true,
        phone9: true,
        phone10: true,
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 }
      );
    }

    const firstPhone = PHONE_FIELDS.map((f) => client[f]).find(Boolean);

    if (!firstPhone) {
      return NextResponse.json(
        { error: "Cliente sem telefone cadastrado" },
        { status: 400 }
      );
    }

    const phoneNumber = `55${normalizePhone(firstPhone)}`;

    const zApiUrl = `https://api.z-api.io/instances/${config.instanceId}/token/${config.token}/send-text`;

    const resp = await fetch(zApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: phoneNumber, message: message.trim() }),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      console.error("Z-API send error:", resp.status, errText);
      return NextResponse.json(
        { error: "Falha ao enviar mensagem via WhatsApp" },
        { status: 502 }
      );
    }

    await prisma.clientHistory.create({
      data: {
        clientId: client.id,
        type: "WHATSAPP",
        note: `[enviado] ${message.trim()}`,
        createdById: user.id,
      },
    });

    return NextResponse.json({ ok: true });
  });
}
