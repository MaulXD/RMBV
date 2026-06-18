import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getChamadoIfAllowed } from "@/lib/chamado-access";
import { recordChamadoHistory, recordChamadoStatusChange } from "@/lib/chamado-history";
import { formatChamadoForApi, chamadoListInclude } from "@/lib/chamado-query";
import { CHAMADO_STATUS_LABELS, PRIORITY_LABELS } from "@/lib/enum-labels";
import { computeChamadoSlaDueAt } from "@/lib/chamado-sla-config";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";

const updateChamadoSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(8000).optional().nullable(),
  status: z
    .enum(["ABERTO", "EM_ANDAMENTO", "AGUARDANDO_VALIDACAO", "AG_FECHAMENTO", "FECHADO"])
    .optional(),
  priority: z.enum(["BAIXA", "MEDIA", "ALTA"]).optional(),
  category: z.enum(["BUG", "SUGESTOES", "SOLICITACOES"]).optional(),
  assigneeId: z.string().uuid().optional().nullable(),
  clientId: z.string().uuid().optional().nullable(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    const { id } = await params;
    const chamado = await getChamadoIfAllowed(id, user);
    if (!chamado) {
      return NextResponse.json({ error: "Chamado não encontrado" }, { status: 404 });
    }
    return NextResponse.json({ chamado: formatChamadoForApi(chamado) });
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    const { id } = await params;
    const existing = await getChamadoIfAllowed(id, user);
    if (!existing) {
      return NextResponse.json({ error: "Chamado não encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateChamadoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    if (parsed.data.clientId) {
      const client = await prisma.client.findFirst({
        where: { id: parsed.data.clientId, teamId: existing.teamId },
        select: { id: true },
      });
      if (!client) {
        return NextResponse.json({ error: "Cliente não encontrado nesta equipe" }, { status: 400 });
      }
    }

    if (parsed.data.assigneeId) {
      const assignee = await prisma.user.findFirst({
        where: { id: parsed.data.assigneeId, teamId: existing.teamId, isActive: true },
        select: { id: true },
      });
      if (!assignee) {
        return NextResponse.json({ error: "Responsável inválido para esta equipe" }, { status: 400 });
      }
    }

    const chamado = await prisma.$transaction(async (tx) => {
      if (parsed.data.status && parsed.data.status !== existing.status) {
        await recordChamadoStatusChange(tx, {
          chamadoId: id,
          createdById: user.id,
          fromStatus: existing.status,
          toStatus: parsed.data.status,
        });
      }

      if (
        parsed.data.assigneeId !== undefined &&
        parsed.data.assigneeId !== existing.assigneeId
      ) {
        const fromName = existing.assignee?.name ?? "Ninguém";
        let toName = "Ninguém";
        if (parsed.data.assigneeId) {
          const u = await tx.user.findUnique({
            where: { id: parsed.data.assigneeId },
            select: { name: true },
          });
          toName = u?.name ?? "—";
        }
        await recordChamadoHistory(tx, {
          chamadoId: id,
          createdById: user.id,
          type: "ASSIGNEE_CHANGE",
          fromLabel: fromName,
          toLabel: toName,
          note: `Responsável alterado de "${fromName}" para "${toName}"`,
        });
      }

      if (parsed.data.priority && parsed.data.priority !== existing.priority) {
        await recordChamadoHistory(tx, {
          chamadoId: id,
          createdById: user.id,
          type: "FIELD_UPDATE",
          note: `Prioridade: ${PRIORITY_LABELS[existing.priority]} → ${PRIORITY_LABELS[parsed.data.priority]}`,
        });
      }

      let nextSlaDueAt: Date | null | undefined;
      if (parsed.data.status !== undefined && parsed.data.status !== existing.status) {
        nextSlaDueAt =
          parsed.data.status === "FECHADO"
            ? null
            : await computeChamadoSlaDueAt(existing.teamId, parsed.data.status);
      }

      const updated = await tx.chamado.update({
        where: { id },
        data: {
          ...(parsed.data.title !== undefined ? { title: parsed.data.title.trim() } : {}),
          ...(parsed.data.description !== undefined
            ? { description: parsed.data.description?.trim() || null }
            : {}),
          ...(parsed.data.status !== undefined
            ? {
                status: parsed.data.status,
                statusChangedAt: new Date(),
                ...(nextSlaDueAt !== undefined ? { slaDueAt: nextSlaDueAt } : {}),
              }
            : {}),
          ...(parsed.data.priority !== undefined ? { priority: parsed.data.priority } : {}),
          ...(parsed.data.category !== undefined ? { category: parsed.data.category } : {}),
          ...(parsed.data.assigneeId !== undefined ? { assigneeId: parsed.data.assigneeId } : {}),
          ...(parsed.data.clientId !== undefined ? { clientId: parsed.data.clientId } : {}),
        },
        include: chamadoListInclude,
      });

      if (
        parsed.data.assigneeId &&
        parsed.data.assigneeId !== existing.assigneeId
      ) {
        await createNotification(tx, {
          userId: parsed.data.assigneeId,
          type: "CHAMADO_ASSIGNED",
          title: `Chamado #${existing.number} atribuído a você`,
          body: updated.title,
          href: `/chamados/${id}`,
        });
      }

      return updated;
    });

    return NextResponse.json({ chamado: formatChamadoForApi(chamado) });
  });
}
