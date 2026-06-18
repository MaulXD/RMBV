import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { canManageTeamMembers } from "@/lib/team-access";
import { z } from "zod";

export const runtime = "nodejs";

const patchSchema = z.object({
  role: z.enum(["GERENTE", "COLABORADOR"]).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    if (!canManageTeamMembers(user)) {
      return NextResponse.json(
        { error: "Apenas o ADV da equipe pode gerenciar membros" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, teamId: true, role: true },
    });

    if (!target || target.teamId !== user.teamId) {
      return NextResponse.json({ error: "Membro não encontrado" }, { status: 404 });
    }

    if (target.role === "ADV" || target.role === "ADMIN") {
      return NextResponse.json(
        { error: "Não é possível modificar este usuário" },
        { status: 403 }
      );
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(parsed.data.role !== undefined ? { role: parsed.data.role as Role } : {}),
        ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ member: updated });
  });
}
