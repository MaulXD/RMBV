import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { usesBlobStorage } from "@/lib/document-storage";

export const runtime = "nodejs";

export async function GET() {
  const dbUrl = process.env.DATABASE_URL ?? "";
  const checks: Record<string, string> = {
    JWT_SECRET: process.env.JWT_SECRET ? "ok" : "missing",
    DATABASE_URL: dbUrl ? "ok" : "missing",
    database_provider:
      dbUrl.startsWith("postgresql://") || dbUrl.startsWith("postgres://")
        ? "postgresql"
        : dbUrl.startsWith("file:")
          ? "sqlite (não suportado na Vercel)"
          : "unknown",
    blob_storage: usesBlobStorage() ? "ok (Vercel Blob)" : "local (apenas dev)",
    database: "unknown",
    users: "unknown",
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
    const count = await prisma.user.count();
    checks.users = count > 0 ? `ok (${count} usuário(s))` : "empty — rode o seed";
  } catch (err) {
    checks.database = err instanceof Error ? err.message.slice(0, 120) : "error";
  }

  const healthy =
    checks.JWT_SECRET === "ok" &&
    checks.DATABASE_URL === "ok" &&
    checks.database_provider === "postgresql" &&
    checks.database === "ok" &&
    checks.users !== "unknown" &&
    !checks.users.startsWith("empty");

  return NextResponse.json(
    { ok: healthy, checks },
    { status: healthy ? 200 : 503 }
  );
}
