import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { canConfigureFaceEnrollmentSettings } from "@/lib/team-face-enrollment";

export const runtime = "nodejs";

function resolveTeamId(user: { role: string; teamId: string | null }, request: Request) {
  const url = new URL(request.url);
  if (user.role === "ADMIN") {
    return url.searchParams.get("teamId") ?? user.teamId;
  }
  return user.teamId;
}

export async function GET(request: Request) {
  return withAuth(async (user) => {
    const teamId = resolveTeamId(user, request);
    if (!teamId) return NextResponse.json({ error: "Sem equipe" }, { status: 400 });

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { allowGerenteFaceEnrollment: true },
    });
    if (!team) return NextResponse.json({ error: "Equipe não encontrada" }, { status: 404 });

    if (user.role !== "ADMIN" && user.teamId !== teamId) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    return NextResponse.json({
      allowGerenteFaceEnrollment: team.allowGerenteFaceEnrollment,
      canConfigure: canConfigureFaceEnrollmentSettings(user),
    });
  });
}

export async function PATCH(request: Request) {
  return withAuth(async (user) => {
    if (!canConfigureFaceEnrollmentSettings(user)) {
      return NextResponse.json({ error: "Apenas o ADV pode alterar esta configuração" }, { status: 403 });
    }

    const teamId = resolveTeamId(user, request);
    if (!teamId) return NextResponse.json({ error: "Sem equipe" }, { status: 400 });

    const body = await request.json();
    const allowGerenteFaceEnrollment =
      typeof body.allowGerenteFaceEnrollment === "boolean"
        ? body.allowGerenteFaceEnrollment
        : undefined;

    if (allowGerenteFaceEnrollment === undefined) {
      return NextResponse.json({ error: "Nenhuma alteração informada" }, { status: 400 });
    }

    const updated = await prisma.team.update({
      where: { id: teamId },
      data: { allowGerenteFaceEnrollment },
      select: { allowGerenteFaceEnrollment: true },
    });

    return NextResponse.json({
      allowGerenteFaceEnrollment: updated.allowGerenteFaceEnrollment,
      canConfigure: true,
    });
  });
}
