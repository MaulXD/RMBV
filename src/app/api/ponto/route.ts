import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { withAuth } from "@/lib/api";
import { recordFaceAudit } from "@/lib/face-audit";
import { nextPontoType } from "@/lib/ponto-hours";
import { haversineMeters, isOfficeGpsConfigured } from "@/lib/gps-ponto";
import { parseProbeDescriptor, verifyFaceProbe } from "@/lib/face-verify";

export const runtime = "nodejs";

const recordSchema = z.object({
  userId: z.string().uuid(),
  teamId: z.string().uuid().optional().nullable(),
  type: z.enum(["ENTRADA", "SAIDA", "INTERVALO_INICIO", "INTERVALO_FIM"]).optional(),
  /** Descritor 128D capturado na hora — validado no servidor. */
  descriptor: z.array(z.number()).length(128),
  origin: z.enum(["MOBILE", "KIOSK", "DESKTOP"]).optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
});

async function validateGps(userId: string, latitude?: number | null, longitude?: number | null) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      gpsRequired: true,
      gpsRadiusMeters: true,
      team: {
        select: {
          officeLatitude: true,
          officeLongitude: true,
          defaultGpsRadiusMeters: true,
        },
      },
    },
  });
  if (!user?.gpsRequired) return { ok: true as const };

  if (latitude == null || longitude == null) {
    return { ok: false as const, error: "Localização GPS obrigatória para bater ponto" };
  }

  const officeLat = user.team?.officeLatitude;
  const officeLng = user.team?.officeLongitude;
  if (!isOfficeGpsConfigured(officeLat, officeLng)) {
    return { ok: false as const, error: "Escritório da equipe sem coordenadas GPS configuradas" };
  }

  const radius = user.gpsRadiusMeters ?? user.team?.defaultGpsRadiusMeters ?? 200;
  const dist = haversineMeters(latitude, longitude, officeLat!, officeLng!);
  if (dist > radius) {
    return { ok: false as const, error: `Fora do raio permitido (${Math.round(dist)}m / ${radius}m)` };
  }

  return { ok: true as const };
}

export async function GET(request: Request) {
  return withAuth(async (user) => {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");
    const userId = searchParams.get("userId");
    const date = searchParams.get("date");

    const where: Record<string, unknown> = {};
    if (isAdmin(user)) {
      if (teamId) where.teamId = teamId;
      if (userId) where.userId = userId;
    } else {
      where.teamId = user.teamId;
      if (userId) where.userId = userId;
    }

    if (date) {
      const start = new Date(`${date}T00:00:00`);
      const end = new Date(`${date}T23:59:59`);
      where.recordedAt = { gte: start, lte: end };
    }

    const records = await prisma.pontoRecord.findMany({
      where,
      orderBy: { recordedAt: "asc" },
      take: 500,
      include: {
        user: {
          select: { id: true, name: true, email: true, workType: true },
        },
      },
    });

    return NextResponse.json({ records });
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = recordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const sessionUser = await getSessionUser();
    if (
      sessionUser &&
      parsed.data.userId !== sessionUser.id &&
      !isAdmin(sessionUser)
    ) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const probe = parseProbeDescriptor(parsed.data.descriptor);
    if (!probe) {
      return NextResponse.json({ error: "Descritor facial inválido" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: parsed.data.userId },
      select: {
        id: true,
        name: true,
        isActive: true,
        faceDescriptor: true,
        lgpdFaceConsentAt: true,
        teamId: true,
      },
    });
    if (!user || !user.isActive) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    if (!user.faceDescriptor || !user.lgpdFaceConsentAt) {
      return NextResponse.json(
        { error: "Cadastro facial e consentimento LGPD obrigatórios" },
        { status: 403 },
      );
    }

    const faceCheck = verifyFaceProbe(user.faceDescriptor, probe);
    if (!faceCheck.ok) {
      await recordFaceAudit({
        actorId: parsed.data.userId,
        targetUserId: parsed.data.userId,
        teamId: parsed.data.teamId ?? user.teamId,
        action: "PONTO_FAIL",
        metadata: {
          reason: faceCheck.reason,
          origin: parsed.data.origin,
          distance: faceCheck.distance,
          confidence: faceCheck.confidence,
        },
      });
      return NextResponse.json(
        { error: "Rosto não reconhecido. Tente novamente com boa iluminação." },
        { status: 403 },
      );
    }

    const gpsCheck = await validateGps(
      parsed.data.userId,
      parsed.data.latitude,
      parsed.data.longitude,
    );
    if (!gpsCheck.ok) {
      return NextResponse.json({ error: gpsCheck.error }, { status: 403 });
    }

    const today = new Date().toISOString().slice(0, 10);
    const dayStart = new Date(`${today}T00:00:00`);
    const dayEnd = new Date(`${today}T23:59:59`);

    const todayRecords = await prisma.pontoRecord.findMany({
      where: {
        userId: parsed.data.userId,
        recordedAt: { gte: dayStart, lte: dayEnd },
      },
      orderBy: { recordedAt: "asc" },
      select: { type: true, recordedAt: true },
    });

    const type = parsed.data.type ?? nextPontoType(todayRecords);

    const record = await prisma.pontoRecord.create({
      data: {
        userId: parsed.data.userId,
        teamId: parsed.data.teamId ?? user.teamId,
        type,
        confidence: faceCheck.confidence,
        origin: parsed.data.origin ?? null,
        latitude: parsed.data.latitude ?? null,
        longitude: parsed.data.longitude ?? null,
      },
      include: {
        user: { select: { id: true, name: true, workType: true } },
      },
    });

    await recordFaceAudit({
      actorId: parsed.data.userId,
      targetUserId: parsed.data.userId,
      teamId: record.teamId,
      action: "PONTO_OK",
      metadata: {
        type,
        origin: parsed.data.origin,
        confidence: faceCheck.confidence,
        distance: faceCheck.distance,
      },
    });

    return NextResponse.json({ record }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
