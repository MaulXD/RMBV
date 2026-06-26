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

    const [total, tickets] = await Promise.all([
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
    ]);

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
    });
  });
}
