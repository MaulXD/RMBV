import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { buildClientWhere, clientListInclude } from "@/lib/client-query";
import { clientToExportRow, formatClientForApi } from "@/lib/client-fields";
import { clientsToCsv } from "@/lib/csv-import";

export async function GET(request: Request) {
  return withAuth(async (user) => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const teseId = searchParams.get("teseId");

    const where = await buildClientWhere(user, { status, teseId });

    const clients = await prisma.client.findMany({
      where,
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
