import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  color: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
});

export const runtime = "nodejs";

export async function GET() {
  return withAuth(async () => {
    const teses = await prisma.tese.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { clients: true } } },
    });
    return NextResponse.json({ teses });
  });
}

export async function POST(request: Request) {
  return withAuth(async (user) => {
    if (!isAdmin(user)) {
      return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    try {
      const tese = await prisma.tese.create({
        data: {
          name: parsed.data.name,
          color: parsed.data.color ?? null,
          sortOrder: parsed.data.sortOrder ?? 0,
        },
      });
      return NextResponse.json({ tese }, { status: 201 });
    } catch {
      return NextResponse.json({ error: "Tese já existe ou nome inválido" }, { status: 409 });
    }
  });
}
