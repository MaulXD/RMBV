import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isAdminUser, assertUserHasTeam } from "@/lib/team-access";
import type { SessionUser } from "@/lib/auth";

export const runtime = "nodejs";

const templateSchema = z.object({
  name: z.string().min(1).max(120),
  body: z.string().min(1).max(8000),
  teamId: z.string().uuid().optional(),
});

function resolveTeamId(user: SessionUser, bodyTeamId?: string) {
  if (isAdminUser(user)) {
    if (!bodyTeamId) throw new Error("Informe a equipe do template.");
    return bodyTeamId;
  }
  assertUserHasTeam(user);
  return user.teamId!;
}

export async function GET(request: Request) {
  return withAuth(async (user) => {
    const { searchParams } = new URL(request.url);
    const teamIdParam = searchParams.get("teamId");

    let teamId: string;
    try {
      teamId = isAdminUser(user)
        ? teamIdParam ?? user.teamId ?? ""
        : (user.teamId ?? "");
      if (!teamId) {
        return NextResponse.json({ error: "Equipe não informada" }, { status: 400 });
      }
      if (!isAdminUser(user) && teamId !== user.teamId) {
        return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Usuário sem equipe" }, { status: 403 });
    }

    const templates = await prisma.messageTemplate.findMany({
      where: { teamId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        body: true,
        teamId: true,
        createdAt: true,
        updatedAt: true,
        createdBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ templates });
  });
}

export async function POST(request: Request) {
  return withAuth(async (user) => {
    const body = await request.json();
    const parsed = templateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    let teamId: string;
    try {
      teamId = resolveTeamId(user, parsed.data.teamId);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Equipe inválida" },
        { status: 400 }
      );
    }

    const template = await prisma.messageTemplate.create({
      data: {
        teamId,
        name: parsed.data.name.trim(),
        body: parsed.data.body.trim(),
        createdById: user.id,
      },
      select: {
        id: true,
        name: true,
        body: true,
        teamId: true,
        createdAt: true,
        updatedAt: true,
        createdBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  });
}
