import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { getClientIfAllowed } from "@/lib/client-access";
import { prisma } from "@/lib/prisma";
import { communicationTypeLabel, statusLabel } from "@/lib/client-history";
import { CHAMADO_STATUS_LABELS, PRIORITY_LABELS } from "@/lib/enum-labels";

export const runtime = "nodejs";

type TimelineItem = {
  id: string;
  at: string;
  kind: string;
  title: string;
  body?: string;
  href?: string;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    const { id } = await params;
    const client = await getClientIfAllowed(id, user);
    if (!client) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }

    const [history, documents, tasks, chamados] = await Promise.all([
      prisma.clientHistory.findMany({
        where: { clientId: id },
        orderBy: { createdAt: "desc" },
        include: { createdBy: { select: { name: true } } },
        take: 80,
      }),
      prisma.clientDocument.findMany({
        where: { clientId: id },
        orderBy: { createdAt: "desc" },
        include: { uploadedBy: { select: { name: true } } },
        take: 40,
      }),
      prisma.task.findMany({
        where: { clientId: id },
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true, updatedAt: true, createdAt: true, priority: true },
        take: 30,
      }),
      prisma.chamado.findMany({
        where: { clientId: id },
        orderBy: { updatedAt: "desc" },
        select: { id: true, number: true, title: true, status: true, updatedAt: true },
        take: 20,
      }),
    ]);

    const items: TimelineItem[] = [];

    for (const h of history) {
      const label =
        h.type === "STATUS_CHANGE" && h.fromStatus && h.toStatus
          ? `Status: ${statusLabel(h.fromStatus)} → ${statusLabel(h.toStatus)}`
          : communicationTypeLabel(h.type) ?? h.type;
      items.push({
        id: `h-${h.id}`,
        at: h.createdAt.toISOString(),
        kind: "history",
        title: label,
        body: h.note ?? undefined,
      });
    }

    for (const d of documents) {
      items.push({
        id: `d-${d.id}`,
        at: d.createdAt.toISOString(),
        kind: "document",
        title: "Documento enviado",
        body: `${d.originalName} · ${d.uploadedBy.name}`,
        href: `/clients/${id}`,
      });
    }

    for (const t of tasks) {
      items.push({
        id: `t-${t.id}`,
        at: t.updatedAt.toISOString(),
        kind: "task",
        title: "Tarefa",
        body: `${t.title} · ${PRIORITY_LABELS[t.priority]}`,
        href: "/kanban",
      });
    }

    for (const c of chamados) {
      items.push({
        id: `c-${c.id}`,
        at: c.updatedAt.toISOString(),
        kind: "chamado",
        title: `Chamado #${c.number}`,
        body: `${c.title} · ${CHAMADO_STATUS_LABELS[c.status]}`,
        href: `/chamados/${c.id}`,
      });
    }

    items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    return NextResponse.json({
      client: { id: client.id, name: client.name, status: statusLabel(client.status) },
      items: items.slice(0, 100),
    });
  });
}
