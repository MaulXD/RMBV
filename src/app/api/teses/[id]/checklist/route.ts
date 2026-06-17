import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { assertUserHasTeam, teamScopeForTese } from "@/lib/team-access";
import { canManageChecklistTemplate } from "@/lib/roles";

export const runtime = "nodejs";

const createSchema = z.object({
  label: z.string().min(1).max(300),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    const { id: teseId } = await params;
    const tese = await prisma.tese.findFirst({
      where: { id: teseId, ...teamScopeForTese(user) },
    });
    if (!tese) {
      return NextResponse.json({ error: "Tese não encontrada" }, { status: 404 });
    }

    const items = await prisma.teseChecklistItem.findMany({
      where: { teseId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ items });
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    if (!canManageChecklistTemplate(user)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    if (!isAdmin(user)) assertUserHasTeam(user);

    const { id: teseId } = await params;
    const tese = await prisma.tese.findFirst({
      where: { id: teseId, ...teamScopeForTese(user) },
    });
    if (!tese) {
      return NextResponse.json({ error: "Tese não encontrada" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const maxOrder = await prisma.teseChecklistItem.aggregate({
      where: { teseId },
      _max: { sortOrder: true },
    });

    const item = await prisma.teseChecklistItem.create({
      data: {
        teseId,
        label: parsed.data.label.trim(),
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  });
}
