import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { isValidKioskKey, readKioskKeyFromRequest } from "@/lib/kiosk-auth";
import { nextPontoType } from "@/lib/ponto-hours";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const date = searchParams.get("date");

  if (!userId || !date) {
    return NextResponse.json({ lastType: null, nextType: "ENTRADA" });
  }

  const kioskOk = isValidKioskKey(readKioskKeyFromRequest(request));
  if (!kioskOk) {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (!isAdmin(sessionUser) && userId !== sessionUser.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }
  }

  const start = new Date(`${date}T00:00:00`);
  const end = new Date(`${date}T23:59:59`);

  const records = await prisma.pontoRecord.findMany({
    where: { userId, recordedAt: { gte: start, lte: end } },
    orderBy: { recordedAt: "asc" },
    select: { type: true, recordedAt: true },
  });

  const lastType = records.length ? records[records.length - 1]!.type : null;
  const nextType = nextPontoType(records);

  return NextResponse.json({ lastType, nextType, recordsToday: records.length });
}
