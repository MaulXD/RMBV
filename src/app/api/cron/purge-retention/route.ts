import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const RETENTION_DAYS = 30;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 503 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

  const [ponto, faceAudit] = await Promise.all([
    prisma.pontoRecord.deleteMany({ where: { recordedAt: { lt: cutoff } } }),
    prisma.faceAuditLog.deleteMany({ where: { createdAt: { lt: cutoff } } }),
  ]);

  return NextResponse.json({
    ok: true,
    retentionDays: RETENTION_DAYS,
    deleted: {
      pontoRecords: ponto.count,
      faceAuditLogs: faceAudit.count,
    },
  });
}
