import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { canEnrollTeamMemberFace } from "@/lib/team-face-enrollment";

export const runtime = "nodejs";

const saveSchema = z.object({
  descriptor: z.array(z.number()).length(128),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    const { id } = await params;
    const permission = await canEnrollTeamMemberFace(user, id);
    if (!permission.allowed) {
      return NextResponse.json({ error: permission.error ?? "Sem permissão" }, { status: 403 });
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, faceDescriptor: true },
    });
    if (!target) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    const isSelf = user.id === id;
    return NextResponse.json({
      hasDescriptor: target.faceDescriptor !== null,
      descriptor: isSelf || isAdmin(user) ? target.faceDescriptor : null,
    });
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    const { id } = await params;
    const permission = await canEnrollTeamMemberFace(user, id);
    if (!permission.allowed) {
      return NextResponse.json({ error: permission.error ?? "Sem permissão" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = saveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Descriptor inválido" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id },
      data: { faceDescriptor: parsed.data.descriptor },
    });
    return NextResponse.json({ ok: true });
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    const { id } = await params;
    const permission = await canEnrollTeamMemberFace(user, id);
    if (!permission.allowed) {
      return NextResponse.json({ error: permission.error ?? "Sem permissão" }, { status: 403 });
    }

    await prisma.user.update({ where: { id }, data: { faceDescriptor: Prisma.DbNull } });
    return NextResponse.json({ ok: true });
  });
}
