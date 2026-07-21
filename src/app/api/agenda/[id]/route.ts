import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth";

export const runtime = "nodejs";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional().nullable(),
  allDay: z.boolean().optional(),
  color: z.string().max(20).optional().nullable(),
  clientId: z.string().uuid().optional().nullable(),
});

function canEditEvent(user: SessionUser, event: { createdById: string }) {
  if (user.role === "ADMIN" || user.role === "GERENTE") return true;
  return event.createdById === user.id;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    const { id } = await params;

    const existing = await prisma.calendarEvent.findFirst({
      where: { id, ...(user.teamId ? { teamId: user.teamId } : {}) },
    });

    if (!existing) {
      return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
    }

    if (!canEditEvent(user, existing)) {
      return NextResponse.json({ error: "Sem permissão para editar este evento" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    if (parsed.data.clientId) {
      const client = await prisma.client.findFirst({
        where: { id: parsed.data.clientId, teamId: existing.teamId },
        select: { id: true },
      });
      if (!client) {
        return NextResponse.json({ error: "Cliente não encontrado nesta equipe" }, { status: 400 });
      }
    }

    const event = await prisma.calendarEvent.update({
      where: { id },
      data: {
        ...(parsed.data.title !== undefined ? { title: parsed.data.title.trim() } : {}),
        ...(parsed.data.description !== undefined
          ? { description: parsed.data.description?.trim() || null }
          : {}),
        ...(parsed.data.startsAt !== undefined
          ? { startsAt: new Date(parsed.data.startsAt) }
          : {}),
        ...(parsed.data.endsAt !== undefined
          ? { endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null }
          : {}),
        ...(parsed.data.allDay !== undefined ? { allDay: parsed.data.allDay } : {}),
        ...(parsed.data.color !== undefined ? { color: parsed.data.color || null } : {}),
        ...(parsed.data.clientId !== undefined
          ? { clientId: parsed.data.clientId || null }
          : {}),
      },
      include: {
        client: { select: { id: true, name: true } },
        createdBy: { select: { name: true } },
      },
    });

    return NextResponse.json({ event });
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    const { id } = await params;

    const existing = await prisma.calendarEvent.findFirst({
      where: { id, ...(user.teamId ? { teamId: user.teamId } : {}) },
    });

    if (!existing) {
      return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
    }

    if (!canEditEvent(user, existing)) {
      return NextResponse.json({ error: "Sem permissão para excluir este evento" }, { status: 403 });
    }

    await prisma.calendarEvent.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  });
}
