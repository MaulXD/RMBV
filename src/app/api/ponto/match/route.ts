import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertKioskRequest } from "@/lib/kiosk-auth";
import { parseProbeDescriptor } from "@/lib/face-verify";
import { matchProbeAgainstTeam, teamUsersToFaceCandidates } from "@/lib/ponto-face-match";
import { nextPontoType } from "@/lib/ponto-hours";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const matchSchema = z.object({
  teamId: z.string().uuid(),
  descriptor: z.array(z.number()).length(128),
});

/** Reconhecimento facial no servidor — quiosque não baixa templates biométricos. */
export async function POST(request: Request) {
  const kioskError = assertKioskRequest(request);
  if (kioskError) return kioskError;

  // Per-teamId rate limit — rejects runaway kiosks without blocking IP-NAT neighbors
  const forwardedIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const rl = checkRateLimit(`ponto-match:${forwardedIp}`, "ponto-match");
  if (!rl.allowed) {
    return NextResponse.json({ error: "Taxa de requisições excedida" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const parsed = matchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const probe = parseProbeDescriptor(parsed.data.descriptor);
    if (!probe) {
      return NextResponse.json({ error: "Descritor facial inválido" }, { status: 400 });
    }

    const users = await prisma.user.findMany({
      where: {
        teamId: parsed.data.teamId,
        isActive: true,
        faceDescriptor: { not: Prisma.DbNull },
        lgpdFaceConsentAt: { not: null },
      },
      select: { id: true, name: true, faceDescriptor: true },
    });

    const candidates = teamUsersToFaceCandidates(users);
    if (candidates.length === 0) {
      return NextResponse.json({ error: "Nenhum rosto cadastrado na equipe" }, { status: 404 });
    }

    const match = matchProbeAgainstTeam(probe, candidates);
    if (!match) {
      return NextResponse.json({ matched: false }, { status: 200 });
    }

    const today = new Date().toISOString().slice(0, 10);
    const dayStart = new Date(`${today}T00:00:00`);
    const dayEnd = new Date(`${today}T23:59:59`);

    const todayRecords = await prisma.pontoRecord.findMany({
      where: {
        userId: match.item.id,
        recordedAt: { gte: dayStart, lte: dayEnd },
      },
      orderBy: { recordedAt: "asc" },
      select: { type: true, recordedAt: true },
    });

    return NextResponse.json({
      matched: true,
      user: { id: match.item.id, name: match.item.name },
      confidence: match.confidence,
      distance: match.distance,
      lastType: todayRecords.length ? todayRecords[todayRecords.length - 1]!.type : null,
      nextType: nextPontoType(todayRecords),
      recordsToday: todayRecords.length,
    });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
