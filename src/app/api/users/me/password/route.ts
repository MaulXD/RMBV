import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

export async function POST(request: Request) {
  return withAuth(async (user) => {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Senha nova deve ter ao menos 6 caracteres" }, { status: 400 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });
    if (!dbUser) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

    const ok = await verifyPassword(parsed.data.currentPassword, dbUser.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Senha atual incorreta" }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(parsed.data.newPassword),
        mustChangePassword: false,
      },
    });

    return NextResponse.json({ ok: true });
  });
}
