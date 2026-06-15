import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import {
  canCreateTeamMemberRole,
  canManageTeamMembers,
  TeamAccessError,
  assertUserHasTeam,
} from "@/lib/team-access";
import { z } from "zod";

export const runtime = "nodejs";

const createMemberSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["GERENTE", "COLABORADOR"]),
});

export async function GET() {
  return withAuth(async (user) => {
    if (isAdmin(user)) {
      return NextResponse.json(
        { error: "Use GET /api/teams para listar equipes como admin" },
        { status: 400 }
      );
    }

    try {
      assertUserHasTeam(user);
    } catch (err) {
      if (err instanceof TeamAccessError) {
        return NextResponse.json({ error: err.message }, { status: 403 });
      }
      throw err;
    }

    const members = await prisma.user.findMany({
      where: { teamId: user.teamId!, isActive: true },
      orderBy: [{ role: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    const team = await prisma.team.findUnique({
      where: { id: user.teamId! },
      select: {
        id: true,
        name: true,
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ team, members });
  });
}

export async function POST(request: Request) {
  return withAuth(async (user) => {
    if (!canManageTeamMembers(user)) {
      return NextResponse.json(
        { error: "Apenas o ADV da equipe pode cadastrar gerentes e colaboradores" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = createMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const targetRole = parsed.data.role as Role;
    if (!canCreateTeamMemberRole(user, targetRole)) {
      return NextResponse.json({ error: "Papel não permitido" }, { status: 403 });
    }

    try {
      const passwordHash = await hashPassword(parsed.data.password);
      const member = await prisma.user.create({
        data: {
          name: parsed.data.name.trim(),
          email: parsed.data.email.trim().toLowerCase(),
          passwordHash,
          role: targetRole,
          teamId: user.teamId!,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      return NextResponse.json({ member }, { status: 201 });
    } catch {
      return NextResponse.json({ error: "Email já cadastrado" }, { status: 409 });
    }
  });
}
