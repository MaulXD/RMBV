import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Público — retorna o último registro de ponto do dia para o quiosque determinar ENTRADA/SAIDA
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const date = searchParams.get("date"); // YYYY-MM-DD

  if (!userId || !date) {
    return NextResponse.json({ lastType: null });
  }

  const start = new Date(`${date}T00:00:00`);
  const end = new Date(`${date}T23:59:59`);

  const record = await prisma.pontoRecord.findFirst({
    where: { userId, recordedAt: { gte: start, lte: end } },
    orderBy: { recordedAt: "desc" },
    select: { type: true },
  });

  return NextResponse.json({ lastType: record?.type ?? null });
}
