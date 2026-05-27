import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { usesBlobStorage } from "@/lib/document-storage";
import { isOpenAiConfigured } from "@/lib/openai-env";

export const runtime = "nodejs";

export async function GET() {
  const dbUrlRaw = process.env.DATABASE_URL;
  const dbUrl = dbUrlRaw?.trim() ?? "";
  const checks: Record<string, string> = {
    JWT_SECRET: process.env.JWT_SECRET ? "ok" : "missing",
    DATABASE_URL: dbUrlRaw === undefined
      ? "missing"
      : !dbUrl
        ? "empty — reconecte Neon ou cole URL no painel"
        : dbUrl.startsWith("postgresql://") || dbUrl.startsWith("postgres://")
          ? "ok"
          : "invalid (precisa postgresql://)",
    database_provider:
      dbUrl.startsWith("postgresql://") || dbUrl.startsWith("postgres://")
        ? "postgresql"
        : dbUrl.startsWith("file:")
          ? "sqlite (não suportado na Vercel)"
          : "unknown",
    blob_storage: usesBlobStorage() ? "ok (Vercel Blob)" : "local (apenas dev)",
    openai_extract: isOpenAiConfigured() ? "ok" : "missing — opcional (extração IA)",
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
