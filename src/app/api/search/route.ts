import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isAdminUser } from "@/lib/team-access";
import { getReadableCategoryIds } from "@/lib/permissions";
import { teamScopeWhere } from "@/lib/team-access";
import { buildChamadoWhere } from "@/lib/chamado-access";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withAuth(async (user) => {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    if (q.length < 2) {
      return NextResponse.json({ clients: [], tasks: [], chamados: [], documents: [] });
    }

    const readableIds = await getReadableCategoryIds(user);
    const teamFilter = teamScopeWhere(user);
    const chamadoWhere = isAdminUser(user)
      ? {}
      : buildChamadoWhere(user, {});

    const [clients, tasks, chamados, documents] = await Promise.all([
      prisma.client.findMany({
        where: {
          ...teamFilter,
          categories: { some: { categoryId: { in: readableIds } } },
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { cod: { contains: q, mode: "insensitive" } },
            { cpf: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, cod: true, cpf: true, status: true },
        take: 8,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.task.findMany({
        where: {
          ...(isAdminUser(user) ? {} : user.teamId ? { teamId: user.teamId } : { id: "__none__" }),
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          title: true,
          client: { select: { id: true, name: true } },
        },
        take: 8,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.chamado.findMany({
        where: {
          ...chamadoWhere,
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, number: true, title: true, status: true },
        take: 8,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.clientDocument.findMany({
        where: {
          client: {
            ...teamFilter,
            categories: { some: { categoryId: { in: readableIds } } },
          },
          originalName: { contains: q, mode: "insensitive" },
        },
        select: {
          id: true,
          originalName: true,
          clientId: true,
          client: { select: { name: true } },
        },
        take: 8,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      clients: clients.map((c) => ({
        id: c.id,
        label: c.name,
        sub: [c.cod, c.cpf].filter(Boolean).join(" · ") || undefined,
        href: `/clients/${c.id}`,
      })),
      tasks: tasks.map((t) => ({
        id: t.id,
        label: t.title,
        sub: t.client?.name,
        href: `/kanban`,
      })),
      chamados: chamados.map((c) => ({
        id: c.id,
        label: `#${c.number} ${c.title}`,
        sub: c.status,
        href: `/chamados/${c.id}`,
      })),
      documents: documents.map((d) => ({
        id: d.id,
        label: d.originalName,
        sub: d.client.name,
        href: `/clients/${d.clientId}`,
      })),
    });
  });
}
