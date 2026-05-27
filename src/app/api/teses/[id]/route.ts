import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { assertUserHasTeam, teamScopeForTese } from "@/lib/team-access";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    if (!isAdmin(user) && user.role !== "ADV") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    if (!isAdmin(user)) assertUserHasTeam(user);

    const { id } = await params;
    const tese = await prisma.tese.findFirst({
      where: { id, ...teamScopeForTese(user) },
    });

    if (!tese) {
      return NextResponse.json({ error: "Tese não encontrada" }, { status: 404 });
    }

    await prisma.client.updateMany({ where: { teseId: id }, data: { teseId: null } });
    await prisma.tese.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  });
}
