import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(50000),
});

const bulkAssignTeseSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(50000),
  teseId: z.string().uuid().nullable(),
});

export async function DELETE(request: Request) {
  return withAuth(async (user) => {
    if (user.role !== "ADV" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = bulkDeleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "IDs inválidos" }, { status: 400 });
    }

    const { ids } = parsed.data;

    const where =
      user.role === "ADMIN"
        ? { id: { in: ids } }
        : { id: { in: ids }, teamId: user.teamId ?? "__none__" };

    const { count } = await prisma.client.deleteMany({ where });

    return NextResponse.json({ deleted: count });
  });
}

export async function PATCH(request: Request) {
  return withAuth(async (user) => {
    if (user.role !== "ADV" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = bulkAssignTeseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const { ids, teseId } = parsed.data;

    let teseName: string | null = null;
    if (teseId) {
      const tese = await prisma.tese.findUnique({ where: { id: teseId }, select: { name: true } });
      if (!tese) return NextResponse.json({ error: "Tese não encontrada" }, { status: 404 });
      teseName = tese.name;
    }

    const where =
      user.role === "ADMIN"
        ? { id: { in: ids } }
        : { id: { in: ids }, teamId: user.teamId ?? "__none__" };

    const { count } = await prisma.client.updateMany({
      where,
      data: { teseId, tese: teseName },
    });

    return NextResponse.json({ updated: count });
  });
}
