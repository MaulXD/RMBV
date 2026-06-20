import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { assertUserHasTeam, teamScopeForTese } from "@/lib/team-access";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  color: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
  teamId: z.string().uuid().optional(),
});

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withAuth(async (user) => {
    const { searchParams } = new URL(request.url);
    const teamIdParam = searchParams.get("teamId");

    // Admin can filter by specific team; others always see their own team
    const teamFilter: Prisma.TeseWhereInput =
      isAdmin(user) && teamIdParam
        ? { teamId: teamIdParam }
        : teamScopeForTese(user);

    const teses = await prisma.tese.findMany({
      where: { isActive: true, ...teamFilter },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { clients: true } } },
    });
    return NextResponse.json({ teses });
  });
}

export async function POST(request: Request) {
  return withAuth(async (user) => {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    let teamId: string | null = null;
    if (isAdmin(user)) {
      teamId = parsed.data.teamId ?? null;
      if (!teamId) {
        return NextResponse.json(
          { error: "Informe a equipe (teamId) ao criar tese como admin" },
          { status: 400 }
        );
      }
    } else {
      assertUserHasTeam(user);
      teamId = user.teamId!;
    }

    try {
      const tese = await prisma.tese.create({
        data: {
          name: parsed.data.name.trim(),
          color: parsed.data.color ?? null,
          sortOrder: parsed.data.sortOrder ?? 0,
          teamId,
        },
      });
      return NextResponse.json({ tese }, { status: 201 });
    } catch {
      return NextResponse.json(
        { error: "Tese já existe nesta equipe ou nome inválido" },
        { status: 409 }
      );
    }
  });
}
