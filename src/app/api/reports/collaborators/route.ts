import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withAuth(async (user) => {
    const { searchParams } = new URL(request.url);
    const startRaw = searchParams.get("startDate");
    const endRaw = searchParams.get("endDate");
    if (!startRaw || !endRaw)
      return NextResponse.json({ error: "startDate e endDate obrigatórios" }, { status: 400 });

    const startDate = new Date(startRaw + "T00:00:00");
    const endDate = new Date(endRaw + "T23:59:59");
    const teamId =
      user.role === "ADMIN"
        ? (searchParams.get("teamId") || undefined)
        : (user.teamId ?? undefined);

    // Team members
    const members = await prisma.user.findMany({
      where: {
        ...(teamId ? { teamId } : {}),
        isActive: true,
        role: { in: ["ADV", "GERENTE", "COLABORADOR"] },
      },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    });

    if (members.length === 0) return NextResponse.json({ collaborators: [] });

    const memberIds = members.map((m) => m.id);

    // Clients created in period by each member
    const created = await prisma.client.groupBy({
      by: ["createdById"],
      where: {
        createdById: { in: memberIds },
        ...(teamId ? { teamId } : {}),
        createdAt: { gte: startDate, lte: endDate },
      },
      _count: { _all: true },
    });

    // Clients finalized in period by each member
    const finalized = await prisma.client.groupBy({
      by: ["finalizedById"],
      where: {
        finalizedById: { in: memberIds },
        ...(teamId ? { teamId } : {}),
        workflowStatus: "FINALIZADO",
        finalizedAt: { gte: startDate, lte: endDate },
      },
      _count: { _all: true },
    });

    // Clients localized (current status) created by each member in period
    const localized = await prisma.client.groupBy({
      by: ["createdById"],
      where: {
        createdById: { in: memberIds },
        ...(teamId ? { teamId } : {}),
        status: "LOCALIZADO",
        createdAt: { gte: startDate, lte: endDate },
      },
      _count: { _all: true },
    });

    // Pesquisas updated in period
    const pesquisas = await prisma.clientHistory.groupBy({
      by: ["createdById"],
      where: {
        createdById: { in: memberIds },
        type: "PESQUISA_UPDATED",
        createdAt: { gte: startDate, lte: endDate },
        ...(teamId ? { client: { teamId } } : {}),
      },
      _count: { _all: true },
    });

    // Last login per member
    const sessions = await prisma.userSession.findMany({
      where: { userId: { in: memberIds } },
      orderBy: { loginAt: "desc" },
      select: { userId: true, loginAt: true },
    });
    const lastLoginMap: Record<string, string> = {};
    for (const s of sessions) {
      if (!lastLoginMap[s.userId]) lastLoginMap[s.userId] = s.loginAt.toISOString();
    }

    // Logins in period
    const loginsInPeriod = await prisma.userSession.groupBy({
      by: ["userId"],
      where: {
        userId: { in: memberIds },
        loginAt: { gte: startDate, lte: endDate },
      },
      _count: { _all: true },
    });

    // Build index maps
    const createdMap = Object.fromEntries(created.map((r) => [r.createdById, r._count._all]));
    const finalizedMap = Object.fromEntries(
      finalized.map((r) => [r.finalizedById ?? "", r._count._all])
    );
    const localizedMap = Object.fromEntries(localized.map((r) => [r.createdById, r._count._all]));
    const pesquisasMap = Object.fromEntries(pesquisas.map((r) => [r.createdById, r._count._all]));
    const loginsMap = Object.fromEntries(loginsInPeriod.map((r) => [r.userId, r._count._all]));

    const collaborators = members.map((m) => {
      const totalCreated = createdMap[m.id] ?? 0;
      const totalFinalized = finalizedMap[m.id] ?? 0;
      const totalLocalized = localizedMap[m.id] ?? 0;
      const totalPesquisas = pesquisasMap[m.id] ?? 0;
      const totalLogins = loginsMap[m.id] ?? 0;
      const finalizationRate =
        totalCreated > 0 ? Math.round((totalFinalized / totalCreated) * 100) : 0;

      return {
        id: m.id,
        name: m.name,
        role: m.role,
        totalCreated,
        totalFinalized,
        totalLocalized,
        totalPesquisas,
        totalLogins,
        finalizationRate,
        lastLogin: lastLoginMap[m.id] ?? null,
      };
    });

    return NextResponse.json({ collaborators, period: { start: startRaw, end: endRaw } });
  });
}
