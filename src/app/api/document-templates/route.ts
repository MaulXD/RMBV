import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { assertUserHasTeam, isAdminUser } from "@/lib/team-access";

export const runtime = "nodejs";

const createSchema = z.object({
  name: z.string().min(2).max(120),
  body: z.string().min(10).max(20000),
  teamId: z.string().uuid().optional(),
});

export async function GET(request: Request) {
  return withAuth(async (user) => {
    const { searchParams } = new URL(request.url);
    let teamId = isAdminUser(user) ? searchParams.get("teamId") : user.teamId;
    if (!teamId && !isAdminUser(user)) {
      assertUserHasTeam(user);
      teamId = user.teamId!;
    }
    if (!teamId) {
      return NextResponse.json({ templates: [] });
    }

    const templates = await prisma.documentTemplate.findMany({
      where: { teamId },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ templates });
  });
}

export async function POST(request: Request) {
  return withAuth(async (user) => {
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    let teamId = parsed.data.teamId ?? user.teamId;
    if (!isAdminUser(user)) {
      assertUserHasTeam(user);
      teamId = user.teamId!;
    }
    if (!teamId) {
      return NextResponse.json({ error: "Equipe obrigatória" }, { status: 400 });
    }

    const template = await prisma.documentTemplate.create({
      data: {
        teamId,
        name: parsed.data.name.trim(),
        body: parsed.data.body,
      },
    });
    return NextResponse.json({ template });
  });
}
