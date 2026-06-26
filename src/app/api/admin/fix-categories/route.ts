import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";

const schema = z.object({
  teamId: z.string().uuid(),
  categoryId: z.string().uuid(),
});

export async function POST(request: Request) {
  return withAuth(async (user) => {
    if (!isAdmin(user)) {
      return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "teamId e categoryId obrigatórios" }, { status: 400 });
    }

    const { teamId, categoryId } = parsed.data;

    const [team, category] = await Promise.all([
      prisma.team.findUnique({ where: { id: teamId }, select: { id: true } }),
      prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } }),
    ]);
    if (!team) return NextResponse.json({ error: "Equipe não encontrada" }, { status: 404 });
    if (!category) return NextResponse.json({ error: "Categoria não encontrada" }, { status: 404 });

    const withoutCategory = await prisma.client.findMany({
      where: { teamId, categories: { none: {} } },
      select: { id: true },
    });

    if (withoutCategory.length === 0) {
      return NextResponse.json({ fixed: 0, message: "Todos os clientes já têm categoria" });
    }

    const BATCH = 1000;
    let fixed = 0;
    for (let i = 0; i < withoutCategory.length; i += BATCH) {
      const batch = withoutCategory.slice(i, i + BATCH);
      const result = await prisma.clientCategory.createMany({
        data: batch.map((c) => ({ clientId: c.id, categoryId })),
        skipDuplicates: true,
      });
      fixed += result.count;
    }

    return NextResponse.json({ fixed, message: `${fixed} cliente(s) corrigido(s)` });
  });
}
