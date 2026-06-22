import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { EXPORT_MAX_CLIENTS } from "@/lib/export-limits";
import { recordAuditLog } from "@/lib/audit-log";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withAuth(async (user) => {
    if (!isAdmin(user)) {
      return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");

    const teamFilter = teamId ? { teamId } : {};

    const clientWhere = teamFilter;
    const totalClients = await prisma.client.count({ where: clientWhere });

    const [team, teses, clients, members] = await Promise.all([
      teamId ? prisma.team.findUnique({ where: { id: teamId }, select: { id: true, name: true } }) : null,
      prisma.tese.findMany({
        where: teamFilter,
        select: { id: true, name: true, color: true, sortOrder: true, createdAt: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.client.findMany({
        where: clientWhere,
        select: {
          id: true, cod: true, tese: true, teseId: true, name: true, cpf: true,
          birthDate: true, obito: true, deathDate: true,
          phone1: true, phone2: true, phone3: true, phone4: true, phone5: true,
          phone6: true, phone7: true, phone8: true, phone9: true, phone10: true,
          address1: true, address2: true, address3: true,
          status: true, workflowStatus: true, pesquisa: true,
          createdAt: true, updatedAt: true,
          teamId: true,
        },
        orderBy: { createdAt: "asc" },
        take: EXPORT_MAX_CLIENTS,
      }),
      prisma.user.findMany({
        where: teamId ? { teamId } : {},
        select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
        orderBy: { name: "asc" },
      }),
    ]);

    const truncated = totalClients > EXPORT_MAX_CLIENTS;

    await recordAuditLog(prisma, {
      userId: user.id,
      action: "CREATE",
      entity: "Backup",
      entityId: teamId,
      summary: `Backup exportado${truncated ? " (parcial)" : ""} — ${clients.length} cliente(s)`,
      metadata: {
        teamName: team?.name ?? "all",
        clientsExported: clients.length,
        clientsTotal: totalClients,
        truncated,
      },
    });

    const payload = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      team: team ?? { id: "all", name: "Todas as equipes" },
      truncated,
      limits: { maxClients: EXPORT_MAX_CLIENTS },
      stats: {
        clients: clients.length,
        clientsTotal: totalClients,
        teses: teses.length,
        members: members.length,
      },
      teses,
      clients,
      members,
    };

    const json = JSON.stringify(payload, null, 2);
    const filename = `backup_${team?.name.replace(/\s+/g, "_") ?? "all"}_${new Date().toISOString().slice(0, 10)}${truncated ? "_parcial" : ""}.json`;

    return new NextResponse(json, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Export-Truncated": truncated ? "true" : "false",
      },
    });
  });
}
