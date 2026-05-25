import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getClientIfAllowed } from "@/lib/client-access";
import {
  formatHistoryEntry,
  latestPhoneChecksFromHistory,
} from "@/lib/client-history";

export const runtime = "nodejs";

const historyInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
} as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    const { id } = await params;
    const client = await getClientIfAllowed(id, user);
    if (!client) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }

    const rows = await prisma.clientHistory.findMany({
      where: { clientId: id },
      orderBy: { createdAt: "desc" },
      include: historyInclude,
    });

    const entries = rows.map(formatHistoryEntry);
    const latestPhoneChecks = latestPhoneChecksFromHistory(entries);

    return NextResponse.json({ entries, latestPhoneChecks });
  });
}
