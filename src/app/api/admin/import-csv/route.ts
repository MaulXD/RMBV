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
    const teseId = String(formData.get("teseId") ?? "").trim() || null;
    const teseName = String(formData.get("teseName") ?? "").trim() || null;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo CSV obrigatório" }, { status: 400 });
    }
    if (!teamId) {
      return NextResponse.json({ error: "Equipe obrigatória" }, { status: 400 });
    }

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      return NextResponse.json({ error: "Equipe inválida" }, { status: 400 });
    }

    // Resolve the tese override chosen in the form (create if needed)
    let overrideTeseData: { teseId: string | null; tese: string | null } | null = null;
    if (teseId) {
      const tese = await prisma.tese.findUnique({ where: { id: teseId }, select: { id: true, name: true } });
      if (!tese) return NextResponse.json({ error: "Tese selecionada não encontrada" }, { status: 400 });
      overrideTeseData = { teseId: tese.id, tese: tese.name };
    } else if (teseName) {
      // Find or create tese with this name for the team
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

    let imported = 0;
    for (const row of rows) {
      const { tese, ...rest } = row;
      // Form selection takes priority; fall back to CSV TESE column
      const teseData = overrideTeseData ?? await resolveTeseForClient({ tese, teamId });
      await prisma.client.create({
        data: {
          ...rest,
          ...teseData,
          teamId,
          status: "AGUARDANDO",
          createdById: user.id,
        },
      });
      imported++;
    }

    return NextResponse.json({
      imported,
      skipped: errors.length,
      warnings: errors,
    });
  });
}
