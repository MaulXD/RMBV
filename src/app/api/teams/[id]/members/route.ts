import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (user) => {
    const { id: teamId } = await params;

    // ADV can only see their own team
    if (user.role !== "ADMIN" && user.teamId !== teamId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const members = await prisma.user.findMany({
      where: { teamId },
      orderBy: [{ role: "desc" }, { name: "asc" }],
      select: { id: true, name: true, role: true, isActive: true },
    });

    return NextResponse.json({ members });
  });
}
