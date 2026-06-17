import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { loginIdSchema, normalizeLoginId } from "@/lib/login-id";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { hashPassword } from "@/lib/auth";

export const runtime = "nodejs";

const patchSchema = z.object({
  name: z.string().min(2).optional(),
  email: loginIdSchema.optional(),
  password: z.string().min(6).optional(),
  role: z.enum(["ADV", "GERENTE", "COLABORADOR"]).optional(),
  teamId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    if (!isAdmin(user)) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.user.findUnique({
      where: { id },
      include: { team: { select: { id: true, ownerId: true } } },
    });
    if (!existing || existing.role === Role.ADMIN) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    if (parsed.data.teamId) {
      const team = await prisma.team.findUnique({ where: { id: parsed.data.teamId } });
      if (!team) {
        return NextResponse.json({ error: "Equipe não encontrada" }, { status: 400 });
      }
    }

    const data: {
      name?: string;
      email?: string;
      passwordHash?: string;
      role?: Role;
      teamId?: string;
      isActive?: boolean;
    } = {};

    if (parsed.data.name) data.name = parsed.data.name.trim();
    if (parsed.data.email) data.email = normalizeLoginId(parsed.data.email);
    if (parsed.data.password) data.passwordHash = await hashPassword(parsed.data.password);
    if (parsed.data.role) data.role = parsed.data.role;
    if (parsed.data.teamId) data.teamId = parsed.data.teamId;
    if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;

    try {
      const updated = await prisma.$transaction(async (tx) => {
        const userRow = await tx.user.update({
          where: { id },
          data,
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            team: { select: { id: true, name: true } },
          },
        });

        if (parsed.data.role === Role.ADV && userRow.team) {
          const team = await tx.team.findUnique({ where: { id: userRow.team!.id } });
          if (team && !team.ownerId) {
            await tx.team.update({
              where: { id: team.id },
              data: { ownerId: userRow.id },
            });
          }
        }

        return userRow;
      });

      return NextResponse.json({ user: updated });
    } catch {
      return NextResponse.json({ error: "Email já em uso ou dados inválidos" }, { status: 409 });
    }
  });
}
