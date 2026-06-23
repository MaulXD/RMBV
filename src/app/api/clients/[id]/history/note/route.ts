import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getClientIfAllowed } from "@/lib/client-access";
import {
  assertCategoryPermission,
  PermissionDeniedError,
} from "@/lib/permissions";
import { formatHistoryEntry } from "@/lib/client-history";

export const runtime = "nodejs";

const noteSchema = z.object({
  type: z.enum(["CALL", "WHATSAPP", "NOTE"]),
  note: z.string().min(1).max(8000),
  followUpAt: z.string().datetime().nullable().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    const { id } = await params;
    const existing = await getClientIfAllowed(id, user);
    if (!existing) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }

    const categoryId = existing.categories[0]?.categoryId;
    if (!categoryId) {
      return NextResponse.json({ error: "Cliente sem categoria" }, { status: 400 });
    }

    try {
      await assertCategoryPermission(user, categoryId, "canUpdate");
    } catch (err) {
      if (err instanceof PermissionDeniedError) {
        return NextResponse.json({ error: err.message }, { status: 403 });
      }
      throw err;
    }

    const body = await request.json();
    const parsed = noteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const followUpAt = parsed.data.followUpAt ? new Date(parsed.data.followUpAt) : null;

    const [row] = await prisma.$transaction([
      prisma.clientHistory.create({
        data: {
          clientId: id,
          type: parsed.data.type,
          note: parsed.data.note.trim(),
          createdById: user.id,
        },
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.client.update({
        where: { id },
        data: { followUpAt },
        select: { id: true },
      }),
    ]);

    return NextResponse.json({ entry: formatHistoryEntry(row) }, { status: 201 });
  });
}
