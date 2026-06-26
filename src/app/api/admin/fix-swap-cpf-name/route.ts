import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";

const schema = z.object({
  teamId: z.string().uuid().optional(),
});

// CPF pattern: 11 digits, optionally formatted as XXX.XXX.XXX-XX
const CPF_RE = /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/;

export async function POST(request: Request) {
  return withAuth(async (user) => {
    if (!isAdmin(user)) {
      return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "teamId inválido" }, { status: 400 });
    }

    const { teamId } = parsed.data;

    // Find clients whose name field looks like a CPF (data was swapped on import)
    type SwapRow = { id: string; name: string; cpf: string | null };
    const suspects: SwapRow[] = teamId
      ? await prisma.$queryRaw`
          SELECT id, name, cpf FROM "Client"
          WHERE name ~ '^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$'
            AND "teamId" = ${teamId}::uuid
        `
      : await prisma.$queryRaw`
          SELECT id, name, cpf FROM "Client"
          WHERE name ~ '^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$'
        `;

    if (suspects.length === 0) {
      return NextResponse.json({ fixed: 0, message: "Nenhum cliente com CPF/Nome trocados encontrado" });
    }

    // Filter with JS regex as a safety double-check
    const toFix = suspects.filter((c) => CPF_RE.test(c.name));

    let fixed = 0;
    const BATCH = 200;
    for (let i = 0; i < toFix.length; i += BATCH) {
      const batch = toFix.slice(i, i + BATCH);
      await Promise.all(
        batch.map((c) =>
          prisma.client.update({
            where: { id: c.id },
            data: { name: c.cpf ?? "", cpf: c.name },
          })
        )
      );
      fixed += batch.length;
    }

    return NextResponse.json({ fixed, message: `${fixed} cliente(s) corrigido(s): CPF e Nome foram trocados` });
  });
}
