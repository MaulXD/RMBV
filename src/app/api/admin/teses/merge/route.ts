import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { z } from "zod";

export const runtime = "nodejs";

const mergeSchema = z.object({
  sourceTeseId: z.string().uuid(),
  targetTeseId: z.string().uuid(),
  deleteSource: z.boolean().default(true),
});

export async function POST(request: Request) {
  return withAuth(async (user) => {
    if (!isAdmin(user)) {
      return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = mergeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const { sourceTeseId, targetTeseId, deleteSource } = parsed.data;

    if (sourceTeseId === targetTeseId) {
      return NextResponse.json({ error: "Origem e destino não podem ser iguais" }, { status: 400 });
    }

    const [source, target] = await Promise.all([
      prisma.tese.findUnique({ where: { id: sourceTeseId }, select: { id: true, name: true } }),
      prisma.tese.findUnique({ where: { id: targetTeseId }, select: { id: true, name: true } }),
    ]);

    if (!source) return NextResponse.json({ error: "Tese origem não encontrada" }, { status: 404 });
    if (!target) return NextResponse.json({ error: "Tese destino não encontrada" }, { status: 404 });

    // Move all clients from source → target
    const { count } = await prisma.client.updateMany({
      where: { teseId: sourceTeseId },
      data: { teseId: targetTeseId, tese: target.name },
    });

    // Also update string-only tese references that match source name
    await prisma.client.updateMany({
      where: { teseId: null, tese: source.name },
      data: { teseId: targetTeseId, tese: target.name },
    });

    if (deleteSource) {
      await prisma.tese.delete({ where: { id: sourceTeseId } });
    }

    return NextResponse.json({ merged: count, source: source.name, target: target.name });
  });
}
