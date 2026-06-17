import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { TeamAccessError } from "@/lib/team-access";
import { resolveTaskTeamId } from "@/lib/task-access";

export const runtime = "nodejs";

const createLabelSchema = z.object({
  name: z.string().min(1).max(40),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  teamId: z.string().uuid().optional(),
});

export async function GET(request: Request) {
  return withAuth(async (user) => {
    const { searchParams } = new URL(request.url);
    const teamIdParam = searchParams.get("teamId");

    let teamId: string;
    try {
      teamId = resolveTaskTeamId(user, teamIdParam);
    } catch (err) {
      if (err instanceof TeamAccessError) {
        return NextResponse.json({ error: err.message }, { status: 403 });
      }
      throw err;
    }

    const labels = await prisma.taskLabel.findMany({
      where: { teamId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true },
    });

    return NextResponse.json({ labels });
  });
}

export async function POST(request: Request) {
  return withAuth(async (user) => {
    const body = await request.json();
    const parsed = createLabelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    let teamId: string;
    try {
      teamId = resolveTaskTeamId(user, parsed.data.teamId);
    } catch (err) {
      if (err instanceof TeamAccessError) {
        return NextResponse.json({ error: err.message }, { status: 403 });
      }
      throw err;
    }

    const name = parsed.data.name.trim();
    const existing = await prisma.taskLabel.findUnique({
      where: { teamId_name: { teamId, name } },
    });
    if (existing) {
      return NextResponse.json({ label: existing });
    }

    const label = await prisma.taskLabel.create({
      data: {
        teamId,
        name,
        color: parsed.data.color ?? "#0f766e",
      },
      select: { id: true, name: true, color: true },
    });

    return NextResponse.json({ label }, { status: 201 });
  });
}

export async function DELETE(request: Request) {
  return withAuth(async (user) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
    }

    const label = await prisma.taskLabel.findUnique({ where: { id } });
    if (!label) {
      return NextResponse.json({ error: "Etiqueta não encontrada" }, { status: 404 });
    }

    try {
      resolveTaskTeamId(user, label.teamId);
    } catch (err) {
      if (err instanceof TeamAccessError) {
        return NextResponse.json({ error: err.message }, { status: 403 });
      }
      throw err;
    }

    await prisma.taskLabel.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  });
}
