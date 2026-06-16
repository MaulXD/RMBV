import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isAdminUser } from "@/lib/team-access";
import type { SessionUser } from "@/lib/auth";

export const runtime = "nodejs";

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  body: z.string().min(1).max(8000).optional(),
});

async function getTemplateIfAllowed(id: string, user: SessionUser) {
  const template = await prisma.messageTemplate.findUnique({ where: { id } });
  if (!template) return null;
  if (!isAdminUser(user) && template.teamId !== user.teamId) return null;
  return template;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    const { id } = await params;
    const existing = await getTemplateIfAllowed(id, user);
    if (!existing) {
      return NextResponse.json({ error: "Template não encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const template = await prisma.messageTemplate.update({
      where: { id },
      data: {
        ...(parsed.data.name ? { name: parsed.data.name.trim() } : {}),
        ...(parsed.data.body ? { body: parsed.data.body.trim() } : {}),
      },
      select: {
        id: true,
        name: true,
        body: true,
        teamId: true,
        createdAt: true,
        updatedAt: true,
        createdBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ template });
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    const { id } = await params;
    const existing = await getTemplateIfAllowed(id, user);
    if (!existing) {
      return NextResponse.json({ error: "Template não encontrado" }, { status: 404 });
    }

    await prisma.messageTemplate.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  });
}
