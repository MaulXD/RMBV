import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional().nullable(),
  allDay: z.boolean().optional(),
  color: z.string().max(20).optional().nullable(),
  clientId: z.string().uuid().optional().nullable(),
});

export async function GET(request: Request) {
  return withAuth(async (user) => {
    if (!user.teamId) {
      return NextResponse.json({ events: [] });
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const events = await prisma.calendarEvent.findMany({
      where: {
        teamId: user.teamId,
        ...(from || to
          ? {
              startsAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      include: {
        client: { select: { id: true, name: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { startsAt: "asc" },
    });

    return NextResponse.json({ events });
  });
}

export async function POST(request: Request) {
  return withAuth(async (user) => {
    if (!user.teamId) {
      return NextResponse.json({ error: "Usuário sem equipe" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    if (parsed.data.clientId) {
      const client = await prisma.client.findFirst({
        where: { id: parsed.data.clientId, teamId: user.teamId },
        select: { id: true },
      });
      if (!client) {
        return NextResponse.json({ error: "Cliente não encontrado nesta equipe" }, { status: 400 });
      }
    }

    const event = await prisma.calendarEvent.create({
      data: {
        teamId: user.teamId,
        createdById: user.id,
        title: parsed.data.title.trim(),
        description: parsed.data.description?.trim() || null,
        startsAt: new Date(parsed.data.startsAt),
        endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
        allDay: parsed.data.allDay ?? false,
        color: parsed.data.color || null,
        clientId: parsed.data.clientId || null,
      },
      include: {
        client: { select: { id: true, name: true } },
        createdBy: { select: { name: true } },
      },
    });

    return NextResponse.json({ event }, { status: 201 });
  });
}
