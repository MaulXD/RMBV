import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { parseClientsCsv } from "@/lib/csv-import";
import { resolveTeseForClient } from "@/lib/tese-sync";
export const runtime = "nodejs";

export async function POST(request: Request) {
  return withAuth(async (user) => {
    if (!isAdmin(user)) {
      return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const teamId = String(formData.get("teamId") ?? "");
    const categoryId = String(formData.get("categoryId") ?? "").trim() || null;
    const teseId = String(formData.get("teseId") ?? "").trim() || null;
    const teseName = String(formData.get("teseName") ?? "").trim() || null;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo CSV obrigatório" }, { status: 400 });
    }
    if (!teamId) {
      return NextResponse.json({ error: "Equipe obrigatória" }, { status: 400 });
    }
    if (!categoryId) {
      return NextResponse.json({ error: "Categoria obrigatória" }, { status: 400 });
    }

    const [team, category] = await Promise.all([
      prisma.team.findUnique({ where: { id: teamId } }),
      prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } }),
    ]);
    if (!team) return NextResponse.json({ error: "Equipe inválida" }, { status: 400 });
    if (!category) return NextResponse.json({ error: "Categoria inválida" }, { status: 400 });

    // Resolve tese override
    let overrideTeseData: { teseId: string | null; tese: string | null } | null = null;
    if (teseId) {
      const tese = await prisma.tese.findUnique({ where: { id: teseId }, select: { id: true, name: true } });
      if (!tese) return NextResponse.json({ error: "Tese selecionada não encontrada" }, { status: 400 });
      overrideTeseData = { teseId: tese.id, tese: tese.name };
    } else if (teseName) {
      const existing = await prisma.tese.findFirst({ where: { name: teseName, teamId } });
      if (existing) {
        overrideTeseData = { teseId: existing.id, tese: existing.name };
      } else {
        const created = await prisma.tese.create({
          data: { name: teseName, teamId, color: "#6366f1", sortOrder: 0 },
        });
        overrideTeseData = { teseId: created.id, tese: created.name };
      }
    }

    const content = await file.text();
    const { rows, errors } = parseClientsCsv(content);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Nenhum cliente válido no CSV", details: errors },
        { status: 400 }
      );
    }

    const teseData = overrideTeseData ?? await resolveTeseForClient({ tese: null, teamId });

    // Step 1: bulk insert clients in batches of 500
    const BATCH = 500;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      await prisma.client.createMany({
        data: batch.map((row) => ({
          ...row,
          ...teseData,
          teamId,
          status: "AGUARDANDO",
          createdById: user.id,
        })),
        skipDuplicates: true,
      });
    }

    // Step 2: find all clients in this team without any category and assign the selected one
    const withoutCategory = await prisma.client.findMany({
      where: { teamId, categories: { none: {} } },
      select: { id: true },
    });

    if (withoutCategory.length > 0) {
      const CAT_BATCH = 1000;
      for (let i = 0; i < withoutCategory.length; i += CAT_BATCH) {
        const batch = withoutCategory.slice(i, i + CAT_BATCH);
        await prisma.clientCategory.createMany({
          data: batch.map((c) => ({ clientId: c.id, categoryId })),
          skipDuplicates: true,
        });
      }
    }

    const imported = withoutCategory.length;

    return NextResponse.json({
      imported,
      skipped: rows.length - imported + errors.length,
      warnings: errors,
    });
  });
}
