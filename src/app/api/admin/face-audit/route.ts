import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withAuth(async (user) => {
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId") || undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "100", 10), 500);

    const [failures, totals] = await Promise.all([
      prisma.faceAuditLog.findMany({
        where: {
          action: "PONTO_FAIL",
          ...(teamId ? { teamId } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          createdAt: true,
          teamId: true,
          metadata: true,
          actor: { select: { id: true, name: true } },
        },
      }),
      prisma.faceAuditLog.groupBy({
        by: ["action"],
        where: teamId ? { teamId } : undefined,
        _count: { id: true },
      }),
    ]);

    const counts = Object.fromEntries(
      totals.map((r) => [r.action, r._count.id])
    );

    return NextResponse.json({ failures, counts });
  });
}
