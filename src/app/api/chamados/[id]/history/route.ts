import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { getChamadoIfAllowed } from "@/lib/chamado-access";
import { prisma } from "@/lib/prisma";
import { chamadoHistoryInclude, formatChamadoHistoryEntry } from "@/lib/chamado-history";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    const { id } = await params;
    const chamado = await getChamadoIfAllowed(id, user);
    if (!chamado) {
      return NextResponse.json({ error: "Chamado não encontrado" }, { status: 404 });
    }

    const history = await prisma.chamadoHistory.findMany({
      where: { chamadoId: id },
      orderBy: { createdAt: "desc" },
      include: chamadoHistoryInclude,
    });

    return NextResponse.json({
      history: history.map(formatChamadoHistoryEntry),
    });
  });
}
