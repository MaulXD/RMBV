import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api";
import { getClientIfAllowed } from "@/lib/client-access";

export const runtime = "nodejs";

const ALLOWED_ROLES = ["ADMIN", "ADV", "GERENTE"] as const;

const addressSchema = z.object({
  cep: z.string().optional().nullable(),
  logradouro: z.string().optional().nullable(),
  numero: z.string().optional().nullable(),
  complemento: z.string().optional().nullable(),
  bairro: z.string().optional().nullable(),
  cidade: z.string().optional().nullable(),
  uf: z.string().max(2).optional().nullable(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAuth(async (user) => {
    if (!ALLOWED_ROLES.includes(user.role as (typeof ALLOWED_ROLES)[number])) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const { id } = await params;
    const client = await getClientIfAllowed(id, user);
    if (!client) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = addressSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const data: Record<string, string | null> = {};
    for (const [k, v] of Object.entries(parsed.data)) {
      data[k] = typeof v === "string" ? v.trim() || null : null;
    }

    await prisma.client.update({ where: { id }, data });

    return NextResponse.json({ ok: true, address: data });
  });
}
