import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";

const recordSchema = z.object({
  userId: z.string().uuid(),
  teamId: z.string().uuid().optional().nullable(),
  type: z.enum(["ENTRADA", "SAIDA"]),
  confidence: z.number().min(0).max(1).optional(),
});

export async function GET(request: Request) {
  return withAuth(async (user) => {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");
    const userId = searchParams.get("userId");
    const date = searchParams.get("date"); // YYYY-MM-DD

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
      orderBy: { recordedAt: "desc" },
      take: 500,
      include: {
        user: { select: { id: true, name: true, email: true } },
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

    const user = await prisma.user.findUnique({
      where: { id: parsed.data.userId },
      select: { id: true, name: true, isActive: true },
    });
    if (!user || !user.isActive) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    const record = await prisma.pontoRecord.create({
      data: {
        userId: parsed.data.userId,
        teamId: parsed.data.teamId ?? null,
        type: parsed.data.type,
        confidence: parsed.data.confidence ?? null,
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ record }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
