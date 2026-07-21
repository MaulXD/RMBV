import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
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

function extractPayload(body: Record<string, unknown>): {
  rawPhone: string | null;
  messageText: string | null;
  instanceId: string | null;
  skip: boolean;
} {
  // Evolution API format: { instance, data: { key: { remoteJid, fromMe }, message: { conversation } } }
  if (
    body.data &&
    typeof body.data === "object" &&
    body.data !== null &&
    "key" in body.data
  ) {
    const data = body.data as Record<string, unknown>;
    const key = data.key as Record<string, unknown> | null;
    const message = data.message as Record<string, unknown> | null;

    const fromMe = Boolean(key?.fromMe);
    if (fromMe) return { rawPhone: null, messageText: null, instanceId: null, skip: true };

    const remoteJid = String(key?.remoteJid ?? "");
    const rawPhone = remoteJid.split("@")[0] || null;
    const messageText =
      (message?.conversation as string | null) ??
      ((message?.extendedTextMessage as Record<string, unknown> | null)
        ?.text as string | null) ??
      null;

    const instanceId = String(body.instance ?? "").trim() || null;

    return { rawPhone, messageText, instanceId, skip: false };
  }

  // Z-API format: { phone, text: { message }, isStatusReply, waitingMessage }
  if (body.phone !== undefined) {
    if (body.isStatusReply || body.waitingMessage) {
      return { rawPhone: null, messageText: null, instanceId: null, skip: true };
    }

    const rawPhone = String(body.phone ?? "").trim() || null;
    const textObj = body.text as Record<string, unknown> | null;
    const messageText =
      String((textObj?.message as string | null) ?? "").trim() || null;

    const instanceId =
      String(body.instance ?? body.instanceId ?? "").trim() || null;

    return { rawPhone, messageText, instanceId, skip: false };
  }

  return { rawPhone: null, messageText: null, instanceId: null, skip: true };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    // instanceId from query param, header, or body
    const url = new URL(request.url);
    const instanceIdFromQuery = url.searchParams.get("instance");
    const instanceIdFromHeader = request.headers.get("x-instance-id");

    const { rawPhone, messageText, instanceId: instanceIdFromBody, skip } =
      extractPayload(body);

    if (skip) {
      return NextResponse.json({ ok: true });
    }

    const rawInstanceId =
      instanceIdFromQuery ?? instanceIdFromHeader ?? instanceIdFromBody;

    if (!rawPhone || !messageText || !rawInstanceId) {
      return NextResponse.json({ ok: true });
    }

    const normalizedPhone = normalizePhone(rawPhone);
    if (!normalizedPhone) {
      return NextResponse.json({ ok: true });
    }

    const config = await prisma.whatsAppConfig.findFirst({
      where: { instanceId: rawInstanceId, isActive: true },
      include: {
        team: {
          select: {
            id: true,
            ownerId: true,
            members: {
              where: {
                role: { in: ["ADV", "GERENTE"] },
                isActive: true,
              },
              select: { id: true },
              take: 1,
            },
          },
        },
      },
    });

    if (!config) {
      return NextResponse.json({ ok: true });
    }

    const createdById =
      config.team.ownerId ?? config.team.members[0]?.id ?? null;

    if (!createdById) {
      return NextResponse.json({ ok: true });
    }

    // Use the last 9 digits (core number) as a contains filter to find candidates
    const coreNumber = normalizedPhone.slice(-9);

    const orConditions = PHONE_FIELDS.map(
      (field): Prisma.ClientWhereInput => ({ [field]: { contains: coreNumber } })
    );

    const candidates = await prisma.client.findMany({
      where: {
        teamId: config.teamId,
        OR: orConditions,
      },
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
      take: 20,
    });

    const matchedClient = candidates.find((c) =>
      PHONE_FIELDS.some((field) => {
        const p = c[field];
        return p ? normalizePhone(p) === normalizedPhone : false;
      })
    );

    if (!matchedClient) {
      return NextResponse.json({ ok: true });
    }

    await prisma.clientHistory.create({
      data: {
        clientId: matchedClient.id,
        type: "WHATSAPP",
        note: messageText,
        createdById,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("WhatsApp webhook error:", err);
    return NextResponse.json({ ok: true });
  }
}
