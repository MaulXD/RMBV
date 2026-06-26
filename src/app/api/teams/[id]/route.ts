import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";

const patchSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  isActive: z.boolean().optional(),
  officeLatitude: z.number().min(-90).max(90).optional().nullable(),
  officeLongitude: z.number().min(-180).max(180).optional().nullable(),
  defaultGpsRadiusMeters: z.number().int().min(50).max(5000).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    if (!isAdmin(user)) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.team.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Equipe não encontrada" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const team = await prisma.team.update({
      where: { id },
      data: {
        ...(parsed.data.name ? { name: parsed.data.name.trim() } : {}),
        ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
        ...(parsed.data.officeLatitude !== undefined
          ? { officeLatitude: parsed.data.officeLatitude }
          : {}),
        ...(parsed.data.officeLongitude !== undefined
          ? { officeLongitude: parsed.data.officeLongitude }
          : {}),
        ...(parsed.data.defaultGpsRadiusMeters !== undefined
          ? { defaultGpsRadiusMeters: parsed.data.defaultGpsRadiusMeters }
          : {}),
      },
      include: {
        owner: { select: { id: true, name: true, email: true, role: true } },
        _count: { select: { members: true, clients: true, teses: true } },
      },
    });

    return NextResponse.json({ team });
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    if (!isAdmin(user)) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.team.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Equipe não encontrada" }, { status: 404 });
    }

    const counts = await prisma.team.findUnique({
      where: { id },
      select: { _count: { select: { members: true, clients: true, teses: true } } },
    });

    if (counts && (counts._count.members > 0 || counts._count.clients > 0)) {
      return NextResponse.json({
        error: `Equipe possui ${counts._count.members} membro(s) e ${counts._count.clients} cliente(s). Remova-os antes de excluir.`,
      }, { status: 400 });
    }

    await prisma.team.delete({ where: { id } });
    return NextResponse.json({ success: true });
  });
}
