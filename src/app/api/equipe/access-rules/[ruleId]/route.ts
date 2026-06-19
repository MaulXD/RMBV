import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ ruleId: string }> }
) {
  return withAuth(async (user) => {
    if (user.role !== "ADMIN" && user.role !== "ADV") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { ruleId } = await params;
    const rule = await prisma.userAccessRule.findUnique({
      where: { id: ruleId },
      select: { teamId: true },
    });
    if (!rule) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (user.role !== "ADMIN" && rule.teamId !== user.teamId)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await prisma.userAccessRule.delete({ where: { id: ruleId } });
    return NextResponse.json({ ok: true });
  });
}
