import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getClientIfAllowed } from "@/lib/client-access";

export const runtime = "nodejs";

const patchSchema = z.object({
  itemId: z.string().uuid(),
  isDone: z.boolean(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    const { id: clientId } = await params;
    const client = await getClientIfAllowed(clientId, user);
    if (!client) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }

    if (!client.teseId) {
      return NextResponse.json({ items: [], teseName: client.tese ?? null });
    }

    const [templateItems, progress] = await Promise.all([
      prisma.teseChecklistItem.findMany({
        where: { teseId: client.teseId },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      }),
      prisma.clientChecklistProgress.findMany({
        where: { clientId },
        include: {
          doneBy: { select: { id: true, name: true } },
        },
      }),
    ]);

    const progressMap = new Map(progress.map((p) => [p.itemId, p]));

    return NextResponse.json({
      teseName: client.teseRef?.name ?? client.tese,
      items: templateItems.map((item) => {
        const p = progressMap.get(item.id);
        return {
          id: item.id,
          label: item.label,
          sortOrder: item.sortOrder,
          isDone: p?.isDone ?? false,
          doneAt: p?.doneAt?.toISOString() ?? null,
          doneBy: p?.doneBy ?? null,
        };
      }),
    });
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    const { id: clientId } = await params;
    const client = await getClientIfAllowed(clientId, user);
    if (!client) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }

    if (!client.teseId) {
      return NextResponse.json({ error: "Cliente sem tese vinculada" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const item = await prisma.teseChecklistItem.findFirst({
      where: { id: parsed.data.itemId, teseId: client.teseId },
    });
    if (!item) {
      return NextResponse.json({ error: "Item de checklist inválido" }, { status: 404 });
    }

    const progress = await prisma.clientChecklistProgress.upsert({
      where: {
        clientId_itemId: { clientId, itemId: parsed.data.itemId },
      },
      create: {
        clientId,
        itemId: parsed.data.itemId,
        isDone: parsed.data.isDone,
        doneAt: parsed.data.isDone ? new Date() : null,
        doneById: parsed.data.isDone ? user.id : null,
      },
      update: {
        isDone: parsed.data.isDone,
        doneAt: parsed.data.isDone ? new Date() : null,
        doneById: parsed.data.isDone ? user.id : null,
      },
      include: {
        doneBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      item: {
        id: item.id,
        label: item.label,
        sortOrder: item.sortOrder,
        isDone: progress.isDone,
        doneAt: progress.doneAt?.toISOString() ?? null,
        doneBy: progress.doneBy,
      },
    });
  });
}
