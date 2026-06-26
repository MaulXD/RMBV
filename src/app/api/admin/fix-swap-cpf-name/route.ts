import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";

const schema = z.object({
  teamId: z.string().uuid().optional(),
});

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

    // Fetch all clients for the team and filter by CPF pattern in JS
    // (avoids raw SQL column-name issues across different Prisma/DB configs)
    const all = await prisma.client.findMany({
      where: teamId ? { teamId } : {},
      select: { id: true, name: true, cpf: true },
    });

    const toFix = all.filter((c) => c.name && CPF_RE.test(c.name));

    if (toFix.length === 0) {
      return NextResponse.json({ fixed: 0, message: "Nenhum cliente com CPF/Nome trocados encontrado" });
    }

    const BATCH = 200;
    let fixed = 0;
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

    return NextResponse.json({ fixed, message: `${fixed} cliente(s) corrigido(s)` });
  });
}
