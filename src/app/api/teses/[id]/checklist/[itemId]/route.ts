import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { assertUserHasTeam, teamScopeForTese } from "@/lib/team-access";
import { canManageChecklistTemplate } from "@/lib/roles";

export const runtime = "nodejs";

const patchSchema = z.object({
  label: z.string().min(1).max(300).optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  return withAuth(async (user) => {
    if (!canManageChecklistTemplate(user)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    if (!isAdmin(user)) assertUserHasTeam(user);

    const { id: teseId, itemId } = await params;
    const tese = await prisma.tese.findFirst({
      where: { id: teseId, ...teamScopeForTese(user) },
    });
    if (!tese) {
      return NextResponse.json({ error: "Tese não encontrada" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const existing = await prisma.teseChecklistItem.findFirst({
      where: { id: itemId, teseId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });
    }

    const item = await prisma.teseChecklistItem.update({
      where: { id: itemId },
      data: {
        ...(parsed.data.label != null ? { label: parsed.data.label.trim() } : {}),
        ...(parsed.data.sortOrder != null ? { sortOrder: parsed.data.sortOrder } : {}),
      },
    });

    return NextResponse.json({ item });
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  return withAuth(async (user) => {
    if (!canManageChecklistTemplate(user)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    if (!isAdmin(user)) assertUserHasTeam(user);

    const { id: teseId, itemId } = await params;
    const tese = await prisma.tese.findFirst({
      where: { id: teseId, ...teamScopeForTese(user) },
    });
    if (!tese) {
      return NextResponse.json({ error: "Tese não encontrada" }, { status: 404 });
    }

    const existing = await prisma.teseChecklistItem.findFirst({
      where: { id: itemId, teseId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });
    }

    await prisma.teseChecklistItem.delete({ where: { id: itemId } });
    return NextResponse.json({ ok: true });
  });
}
