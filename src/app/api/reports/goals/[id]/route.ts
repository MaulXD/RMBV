import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isAdminUser } from "@/lib/team-access";

export const runtime = "nodejs";

const patchSchema = z.object({
  targetFinalizations: z.number().int().min(1).max(100000),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    if (user.role === "COLABORADOR") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.teamGoal.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Meta não encontrada" }, { status: 404 });
    }
    if (!isAdminUser(user) && existing.teamId !== user.teamId) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const goal = await prisma.teamGoal.update({
      where: { id },
      data: { targetFinalizations: parsed.data.targetFinalizations },
      include: { assignee: { select: { id: true, name: true, role: true } } },
    });

    return NextResponse.json({ goal });
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    if (user.role === "COLABORADOR") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.teamGoal.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Meta não encontrada" }, { status: 404 });
    }
    if (!isAdminUser(user) && existing.teamId !== user.teamId) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    await prisma.teamGoal.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  });
}
