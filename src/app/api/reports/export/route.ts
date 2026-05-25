import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getReadableCategoryIds } from "@/lib/permissions";
import { clientToExportRow, formatClientForApi } from "@/lib/client-fields";
import { clientsToCsv } from "@/lib/csv-import";

export async function GET(request: Request) {
  return withAuth(async (user) => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const readableIds = await getReadableCategoryIds(user);

    const clients = await prisma.client.findMany({
      where: {
        categories: { some: { categoryId: { in: readableIds } } },
        ...(status
          ? { status: status as "AGUARDANDO" | "LOCALIZADO" | "SEM_SUCESSO" | "TENTE_NOVAMENTE" }
          : {}),
      },
      orderBy: { name: "asc" },
      include: {
        categories: { include: { category: { select: { id: true, name: true } } } },
      },
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
