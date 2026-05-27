import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { hashPassword } from "@/lib/auth";
import { z } from "zod";

export const runtime = "nodejs";

const createTeamSchema = z.object({
  name: z.string().min(2).max(120),
  ownerName: z.string().min(2).optional(),
  ownerEmail: z.string().email().optional(),
  ownerPassword: z.string().min(6).optional(),
});

export async function GET() {
  return withAuth(async (user) => {
    if (!isAdmin(user)) {
      if (!user.teamId) {
        return NextResponse.json({ teams: [] });
      }
      const team = await prisma.team.findUnique({
        where: { id: user.teamId },
        include: {
          owner: { select: { id: true, name: true, email: true, role: true } },
          _count: { select: { members: true, clients: true, teses: true } },
        },
      });
      return NextResponse.json({ teams: team ? [team] : [] });
    }

    const teams = await prisma.team.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: {
        owner: { select: { id: true, name: true, email: true, role: true } },
        _count: { select: { members: true, clients: true, teses: true } },
      },
    });

    return NextResponse.json({ teams });
  });
}

export async function POST(request: Request) {
  return withAuth(async (user) => {
    if (!isAdmin(user)) {
      return NextResponse.json({ error: "Apenas administradores criam equipes" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createTeamSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const { name, ownerName, ownerEmail, ownerPassword } = parsed.data;

    try {
      const team = await prisma.$transaction(async (tx) => {
        const created = await tx.team.create({
          data: { name: name.trim() },
        });

        if (ownerEmail && ownerPassword && ownerName) {
          const passwordHash = await hashPassword(ownerPassword);
          const adv = await tx.user.create({
            data: {
              name: ownerName.trim(),
              email: ownerEmail.trim().toLowerCase(),
              passwordHash,
              role: Role.ADV,
              teamId: created.id,
              isActive: true,
            },
          });
          await tx.team.update({
            where: { id: created.id },
            data: { ownerId: adv.id },
          });
        }

        return tx.team.findUnique({
          where: { id: created.id },
          include: {
            owner: { select: { id: true, name: true, email: true, role: true } },
            _count: { select: { members: true, clients: true, teses: true } },
          },
        });
      });

      return NextResponse.json({ team }, { status: 201 });
    } catch {
      return NextResponse.json({ error: "Equipe já existe ou email do ADV em uso" }, { status: 409 });
    }
  });
}
