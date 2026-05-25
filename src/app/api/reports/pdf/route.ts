import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { buildClientWhere, clientListInclude } from "@/lib/client-query";
import { formatClientForApi, STATUS_OPTIONS } from "@/lib/client-fields";
import { generateClientsPdfReport } from "@/lib/pdf-report";

export async function GET(request: Request) {
  return withAuth(async (user) => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const teseId = searchParams.get("teseId");

    const where = await buildClientWhere(user, { status, teseId });

    const [clients, byStatusGroups, tese] = await Promise.all([
      prisma.client.findMany({
        where,
        orderBy: { name: "asc" },
        include: clientListInclude,
      }),
      prisma.client.groupBy({
        by: ["status"],
        where,
        _count: { _all: true },
      }),
      teseId ? prisma.tese.findUnique({ where: { id: teseId } }) : null,
    ]);

    const stats = STATUS_OPTIONS.map(({ value, label }) => ({
      label,
      count: byStatusGroups.find((g) => g.status === value)?._count._all ?? 0,
    }));

    const formatted = clients.map((c) => formatClientForApi(c));

    const pdf = await generateClientsPdfReport({
      title: "Relatório de Clientes — RMBV System",
      teseName: tese?.name ?? null,
      statusFilter: status
        ? STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status
        : null,
      generatedAt: new Date(),
      stats,
      clients: formatted,
    });

    const filename = `relatorio-${tese?.name?.replace(/\s+/g, "-") ?? "geral"}-${new Date().toISOString().slice(0, 10)}.pdf`;

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  });
}
