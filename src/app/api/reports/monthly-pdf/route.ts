import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  generateMonthlyPdfReport,
  generateMonthlyPdfWithPreviews,
  type MonthlyReportData,
} from "@/lib/pdf-monthly-report";

export const runtime = "nodejs";

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(key: string) {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString("pt-BR", { month: "short", year: "2-digit" });
}

export async function GET(request: Request) {
  return withAuth(async (user) => {
    const { searchParams } = new URL(request.url);

    const startRaw = searchParams.get("startDate");
    const endRaw = searchParams.get("endDate");
    if (!startRaw || !endRaw) {
      return NextResponse.json({ error: "startDate e endDate obrigatórios" }, { status: 400 });
    }

    const startDate = new Date(startRaw + "T00:00:00");
    const endDate = new Date(endRaw + "T23:59:59");
    const teseId = searchParams.get("teseId") || undefined;
    const teamId = user.role === "ADMIN"
      ? (searchParams.get("teamId") || undefined)
      : (user.teamId ?? undefined);
    const includeCharts = (searchParams.get("charts") || "summary,status,month,collaborator").split(",");
    const docMode = (searchParams.get("docMode") || "list") as "none" | "list" | "preview";

    // Fetch team name
    const team = teamId ? await prisma.team.findUnique({ where: { id: teamId }, select: { name: true } }) : null;
    const tese = teseId ? await prisma.tese.findUnique({ where: { id: teseId }, select: { name: true } }) : null;

    // Fetch clients
    const clients = await prisma.client.findMany({
      where: {
        ...(teamId ? { teamId } : {}),
        ...(teseId ? { teseId } : {}),
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        name: true,
        cod: true,
        cpf: true,
        tese: true,
        status: true,
        workflowStatus: true,
        finalizedAt: true,
        createdAt: true,
        createdById: true,
        createdBy: { select: { id: true, name: true } },
        documents: {
          select: { id: true, originalName: true, storedName: true, mimeType: true, tags: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const finalized = await prisma.client.findMany({
      where: {
        ...(teamId ? { teamId } : {}),
        ...(teseId ? { teseId } : {}),
        workflowStatus: "FINALIZADO",
        finalizedAt: { gte: startDate, lte: endDate },
      },
      select: { id: true, finalizedAt: true, createdById: true, createdBy: { select: { id: true, name: true } } },
    });

    // By status
    const byStatus = ["AGUARDANDO", "LOCALIZADO", "SEM_SUCESSO", "TENTE_NOVAMENTE"].map((status) => ({
      status,
      label: { AGUARDANDO: "Aguardando", LOCALIZADO: "Localizado", SEM_SUCESSO: "Sem sucesso", TENTE_NOVAMENTE: "Tente novamente" }[status] ?? status,
      count: clients.filter((c) => c.status === status).length,
    }));

    // By month
    const monthMap = new Map<string, { created: number; finalized: number }>();
    for (const c of clients) {
      const mk = monthKey(c.createdAt);
      const e = monthMap.get(mk) ?? { created: 0, finalized: 0 };
      e.created++;
      monthMap.set(mk, e);
    }
    for (const c of finalized) {
      if (!c.finalizedAt) continue;
      const mk = monthKey(c.finalizedAt);
      const e = monthMap.get(mk) ?? { created: 0, finalized: 0 };
      e.finalized++;
      monthMap.set(mk, e);
    }
    const byMonth = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => ({ monthKey: key, label: monthLabel(key), ...val }));

    // By collaborator
    const collabMap = new Map<string, { name: string; created: number; finalized: number }>();
    for (const c of clients) {
      const e = collabMap.get(c.createdById) ?? { name: c.createdBy.name, created: 0, finalized: 0 };
      e.created++;
      collabMap.set(c.createdById, e);
    }
    for (const c of finalized) {
      const e = collabMap.get(c.createdById) ?? { name: c.createdBy.name, created: 0, finalized: 0 };
      e.finalized++;
      collabMap.set(c.createdById, e);
    }
    const byCollaborator = Array.from(collabMap.values()).sort((a, b) => b.created - a.created);

    const reportData: MonthlyReportData = {
      period: { start: startRaw, end: endRaw },
      teamName: team?.name ?? "Todas as equipes",
      teseName: tese?.name ?? null,
      summary: {
        totalCreated: clients.length,
        totalFinalized: finalized.length,
        totalLocalized: clients.filter((c) => c.status === "LOCALIZADO").length,
      },
      byStatus,
      byMonth,
      byCollaborator,
      clients: clients.map((c) => ({
        id: c.id,
        name: c.name,
        cod: c.cod ?? null,
        cpf: c.cpf ?? null,
        tese: c.tese ?? null,
        status: c.status,
        documents: c.documents.map((d) => ({
          id: d.id,
          originalName: d.originalName,
          storedName: d.storedName,
          mimeType: d.mimeType,
          tags: (() => { try { return JSON.parse(d.tags); } catch { return []; } })(),
        })),
      })),
      includeCharts,
      docMode,
    };

    let pdfBuffer: Buffer;
    if (docMode === "preview") {
      pdfBuffer = await generateMonthlyPdfWithPreviews(reportData);
    } else {
      pdfBuffer = await generateMonthlyPdfReport(reportData);
    }

    const filename = `relatorio-${startRaw}-a-${endRaw}.pdf`;
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  });
}
