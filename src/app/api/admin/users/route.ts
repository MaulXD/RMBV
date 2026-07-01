import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { hashPassword } from "@/lib/auth";
import { z } from "zod";
import { loginIdSchema, normalizeLoginId } from "@/lib/login-id";

export const runtime = "nodejs";

const createUserSchema = z.object({
  name: z.string().min(2),
  email: loginIdSchema,
  password: z.string().min(6),
  role: z.enum(["ADV", "GERENTE", "COLABORADOR", "PESQUISADOR", "TI", "SUPORTE"]),
  teamId: z.string().uuid(),
});

export async function GET(request: Request) {
  return withAuth(async (user) => {
    if (!isAdmin(user)) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");

    const users = await prisma.user.findMany({
      where: {
        role: { not: Role.ADMIN },
        ...(teamId ? { teamId } : {}),
      },
      orderBy: [{ team: { name: "asc" } }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        team: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ users });
  });
}

export async function POST(request: Request) {
  return withAuth(async (user) => {
    if (!isAdmin(user)) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Dados inválidos" },
        { status: 400 }
      );
    }

    const team = await prisma.team.findUnique({ where: { id: parsed.data.teamId } });
    if (!team) {
      return NextResponse.json({ error: "Equipe não encontrada" }, { status: 400 });
    }

    try {
      const passwordHash = await hashPassword(parsed.data.password);
      const created = await prisma.user.create({
        data: {
          name: parsed.data.name.trim(),
          email: normalizeLoginId(parsed.data.email),
          passwordHash,
          role: parsed.data.role,
          teamId: parsed.data.teamId,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          team: { select: { id: true, name: true } },
        },
      });

      if (parsed.data.role === Role.ADV && !team.ownerId) {
        await prisma.team.update({
          where: { id: team.id },
          data: { ownerId: created.id },
        });
      }

      return NextResponse.json({ user: created }, { status: 201 });
    } catch (err) {
      const message =
        err instanceof Error && err.message.includes("Unique")
          ? "Email já cadastrado"
          : "Não foi possível criar usuário";
      return NextResponse.json({ error: message }, { status: 409 });
    }
  });
}
