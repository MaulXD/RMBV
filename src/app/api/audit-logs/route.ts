import { NextResponse } from "next/server";
import { withAuth, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isAdminUser } from "@/lib/team-access";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withAuth(async (user) => {
    if (!isAdminUser(user)) {
      return jsonError("Apenas administradores", 403);
    }
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return NextResponse.json({ logs });
  });
}
