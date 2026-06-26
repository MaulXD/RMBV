import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withAuth(async (user) => {
    if (user.role !== "TI" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito à equipe TI" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "";
    const search = searchParams.get("search")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const pageSize = 50;

    const where: Record<string, unknown> = {};

    if (status && ["ABERTO", "EM_ANDAMENTO", "RESOLVIDO", "FECHADO"].includes(status)) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sala: { contains: search, mode: "insensitive" } },
        { necessidade: { contains: search, mode: "insensitive" } },
        { obs: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const [total, tickets, dailyRows] = await Promise.all([
      prisma.supportRequest.count({ where }),
      prisma.supportRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          requester: { select: { name: true, email: true } },
          assignedTo: { select: { name: true, email: true } },
          _count: { select: { responses: true } },
        },
      }),
      prisma.supportRequest.groupBy({
        by: ["createdAt"],
        where: { createdAt: { gte: fourteenDaysAgo } },
        _count: { id: true },
      }),
    ] as const);

    // Build daily chart data
    const dailyMap = new Map<string, number>();
    for (const row of dailyRows) {
      const day = row.createdAt.toISOString().slice(0, 10);
      dailyMap.set(day, (dailyMap.get(day) || 0) + row._count.id);
    }
    const dailyStats: { date: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      dailyStats.push({ date: key, count: dailyMap.get(key) || 0 });
    }

    const stats = {
      abertos: await prisma.supportRequest.count({ where: { status: "ABERTO" } }),
      emAndamento: await prisma.supportRequest.count({ where: { status: "EM_ANDAMENTO" } }),
      resolvidos: await prisma.supportRequest.count({ where: { status: "RESOLVIDO" } }),
      fechados: await prisma.supportRequest.count({ where: { status: "FECHADO" } }),
    };

    return NextResponse.json({
      tickets,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      stats,
      dailyStats,
    });
  });
}
