import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  return withAuth(async (user) => {
    if (user.role !== "ADMIN" && user.role !== "ADV" && user.role !== "GERENTE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? "200"), 500);
    const teamId = user.role === "ADMIN"
      ? (searchParams.get("teamId") ?? undefined)
      : (user.teamId ?? undefined);

    const sessions = await prisma.userSession.findMany({
      where: teamId ? { user: { teamId } } : {},
      orderBy: { loginAt: "desc" },
      take: limit,
      select: {
        id: true,
        loginAt: true,
        ipAddress: true,
        userAgent: true,
        user: { select: { id: true, name: true, role: true } },
      },
    });

    return NextResponse.json({ sessions });
  });
}
