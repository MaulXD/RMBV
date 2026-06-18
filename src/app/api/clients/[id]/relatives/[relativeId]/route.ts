import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  relationship: z.string().min(1).optional(),
  phone1: z.string().optional(),
  phone2: z.string().optional(),
  phone3: z.string().optional(),
  notes: z.string().optional(),
});

async function getRelativeAndCheck(user: { role: string; teamId: string | null }, clientId: string, relativeId: string) {
  const relative = await prisma.clientRelative.findFirst({
    where: { id: relativeId, clientId },
    include: { client: { select: { teamId: true } } },
  });
  if (!relative) return { relative: null, error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  if (user.role !== "ADMIN" && relative.client.teamId !== user.teamId)
    return { relative: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { relative, error: null };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; relativeId: string }> }
) {
  return withAuth(async (user) => {
    const { id, relativeId } = await params;
    const { relative, error } = await getRelativeAndCheck(user, id, relativeId);
    if (error) return error;

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

    const updated = await prisma.clientRelative.update({
      where: { id: relative!.id },
      data: parsed.data,
    });
    return NextResponse.json(updated);
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; relativeId: string }> }
) {
  return withAuth(async (user) => {
    const { id, relativeId } = await params;
    const { relative, error } = await getRelativeAndCheck(user, id, relativeId);
    if (error) return error;

    await prisma.clientRelative.delete({ where: { id: relative!.id } });
    return NextResponse.json({ ok: true });
  });
}
