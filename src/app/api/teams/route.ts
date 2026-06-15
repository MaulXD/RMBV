import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { hashPassword } from "@/lib/auth";
import { z } from "zod";

export const runtime = "nodejs";

const createTeamSchema = z
  .object({
    name: z.string().min(2, "Nome da equipe muito curto").max(120),
    ownerName: z.string().optional(),
    ownerEmail: z.string().optional(),
    ownerPassword: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const hasAny = !!(data.ownerName?.trim() || data.ownerEmail?.trim() || data.ownerPassword);
    const hasAll = !!(data.ownerName?.trim() && data.ownerEmail?.trim() && data.ownerPassword);
    if (hasAny && !hasAll) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Para criar o ADV, preencha nome, email e senha.",
        path: ["ownerEmail"],
      });
    }
    if (data.ownerEmail && !z.string().email().safeParse(data.ownerEmail).success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Email do ADV inválido", path: ["ownerEmail"] });
    }
    if (data.ownerPassword && data.ownerPassword.length < 6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Senha do ADV: mínimo 6 caracteres",
        path: ["ownerPassword"],
      });
    }
    if (data.ownerName && data.ownerName.trim().length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Nome do ADV muito curto",
        path: ["ownerName"],
      });
    }
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
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Dados inválidos" },
        { status: 400 }
      );
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
    } catch (err) {
      console.error("[teams POST]", err);
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("Team") || msg.includes("team")) {
        return NextResponse.json(
          {
            error:
              "Tabela de equipes não existe no banco. Rode deploy com db push + seed ou contate suporte.",
          },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: "Equipe já existe ou email do ADV em uso" },
        { status: 409 }
      );
    }
  });
}
