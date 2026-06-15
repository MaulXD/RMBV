import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { buildClientWhere, clientListInclude } from "@/lib/client-query";
import { clientToExportRow, formatClientForApi } from "@/lib/client-fields";
import { clientsToCsv } from "@/lib/csv-import";
export const runtime = "nodejs";

export async function GET(request: Request) {
  return withAuth(async (user) => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const teseId = searchParams.get("teseId");
    const idsParam = searchParams.get("ids");

    const where = await buildClientWhere(user, { status, teseId });
    const ids = idsParam
      ? idsParam.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const clients = await prisma.client.findMany({
      where: ids.length > 0 ? { ...where, id: { in: ids } } : where,
      orderBy: { name: "asc" },
      include: clientListInclude,
    });

    const exportRows = clients.map((c) => clientToExportRow(formatClientForApi(c)));
    const csv = clientsToCsv(exportRows);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="relatorio-clientes-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  });
}
