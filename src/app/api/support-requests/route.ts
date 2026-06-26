import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withAuth(async (user) => {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const pageSize = 50;

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sala: { contains: search, mode: "insensitive" } },
        { necessidade: { contains: search, mode: "insensitive" } },
        { obs: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (startDate || endDate) {
      const createdAt: Record<string, Date> = {};
      if (startDate) createdAt.gte = new Date(startDate);
      if (endDate) createdAt.lte = new Date(endDate + "T23:59:59.999Z");
      where.createdAt = createdAt;
    }

    const [total, requests] = await Promise.all([
      prisma.supportRequest.count({ where }),
      prisma.supportRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { requester: { select: { name: true, email: true } } },
      }),
    ]);

    const necessidades = await prisma.supportRequest.groupBy({
      by: ["necessidade"],
      _count: true,
      orderBy: { _count: { necessidade: "desc" } },
    });

    const porMes = await prisma.$queryRawUnsafe<{ mes: string; total: number }[]>(
      'SELECT to_char("createdAt", \'YYYY-MM\') as mes, COUNT(*)::int as total FROM "SupportRequest" GROUP BY mes ORDER BY mes',
    );

    const totalPeriodo = await prisma.supportRequest.count({
      where: startDate || endDate ? where : undefined,
    });

    return NextResponse.json({
      requests,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      stats: {
        total: await prisma.supportRequest.count(),
        totalPeriodo,
        porNecessidade: necessidades.map((n) => ({
          necessidade: n.necessidade,
          count: n._count,
        })),
        porMes: porMes.map((r) => ({ mes: r.mes, total: r.total })),
      },
    });
  });
}
