import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isOfficeGpsConfigured } from "@/lib/gps-ponto";

export const runtime = "nodejs";

function resolveTeamId(user: { role: string; teamId: string | null }, request: Request) {
  const url = new URL(request.url);
  if (user.role === "ADMIN") {
    return url.searchParams.get("teamId") ?? user.teamId;
  }
  return user.teamId;
}

function canConfigure(user: { role: string }) {
  return user.role === "ADV" || user.role === "ADMIN";
}

export async function GET(request: Request) {
  return withAuth(async (user) => {
    const teamId = resolveTeamId(user, request);
    if (!teamId) return NextResponse.json({ error: "Sem equipe" }, { status: 400 });

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        name: true,
        officeLatitude: true,
        officeLongitude: true,
        defaultGpsRadiusMeters: true,
      },
    });
    if (!team) return NextResponse.json({ error: "Equipe não encontrada" }, { status: 404 });

    return NextResponse.json({
      teamName: team.name,
      officeLatitude: team.officeLatitude,
      officeLongitude: team.officeLongitude,
      defaultGpsRadiusMeters: team.defaultGpsRadiusMeters,
      configured: isOfficeGpsConfigured(team.officeLatitude, team.officeLongitude),
      canConfigure: canConfigure(user),
    });
  });
}

const patchSchema = z.object({
  officeLatitude: z.number().min(-90).max(90).nullable(),
  officeLongitude: z.number().min(-180).max(180).nullable(),
  defaultGpsRadiusMeters: z.number().int().min(50).max(5000).optional(),
});

export async function PATCH(request: Request) {
  return withAuth(async (user) => {
    if (!canConfigure(user)) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const teamId = resolveTeamId(user, request);
    if (!teamId) return NextResponse.json({ error: "Sem equipe" }, { status: 400 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const { officeLatitude, officeLongitude, defaultGpsRadiusMeters } = parsed.data;

    if ((officeLatitude == null) !== (officeLongitude == null)) {
      return NextResponse.json(
        { error: "Informe latitude e longitude juntas, ou limpe ambas" },
        { status: 400 },
      );
    }

    const updated = await prisma.team.update({
      where: { id: teamId },
      data: {
        ...(officeLatitude !== undefined ? { officeLatitude } : {}),
        ...(officeLongitude !== undefined ? { officeLongitude } : {}),
        ...(defaultGpsRadiusMeters !== undefined ? { defaultGpsRadiusMeters } : {}),
      },
      select: {
        name: true,
        officeLatitude: true,
        officeLongitude: true,
        defaultGpsRadiusMeters: true,
      },
    });

    return NextResponse.json({
      teamName: updated.name,
      officeLatitude: updated.officeLatitude,
      officeLongitude: updated.officeLongitude,
      defaultGpsRadiusMeters: updated.defaultGpsRadiusMeters,
      configured: isOfficeGpsConfigured(updated.officeLatitude, updated.officeLongitude),
      canConfigure: true,
    });
  });
}
