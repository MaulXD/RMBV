import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    if (!isAdmin(user)) {
      return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 });
    }

    const { id } = await params;
    await prisma.client.updateMany({ where: { teseId: id }, data: { teseId: null } });
    await prisma.tese.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  });
}
