import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  return withAuth(async (user) => {
    if (!user.teamId) {
      return NextResponse.json({ members: [] });
    }

    const members = await prisma.user.findMany({
      where: { teamId: user.teamId, isActive: true, id: { not: user.id } },
      select: { id: true, name: true, avatarUrl: true, role: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ members });
  });
}
