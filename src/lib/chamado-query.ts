import type { Chamado } from "@prisma/client";
import type { ChamadoListItem } from "./chamado-fields";

export const chamadoListInclude = {
  requester: { select: { id: true, name: true } },
  assignee: { select: { id: true, name: true } },
  client: { select: { id: true, name: true, cod: true } },
  linkedTask: { select: { id: true, title: true } },
  _count: { select: { comments: true, attachments: true } },
} as const;

type ChamadoWithRelations = Chamado & {
  requester: { id: string; name: string };
  assignee: { id: string; name: string } | null;
  client: { id: string; name: string; cod: string | null } | null;
  linkedTask: { id: string; title: string } | null;
  _count: { comments: number; attachments: number };
};

export function formatChamadoForApi(chamado: ChamadoWithRelations): ChamadoListItem {
  return {
    id: chamado.id,
    number: chamado.number,
    title: chamado.title,
    description: chamado.description,
    status: chamado.status,
    priority: chamado.priority,
    category: chamado.category,
    teamId: chamado.teamId,
    requesterId: chamado.requesterId,
    assigneeId: chamado.assigneeId,
    clientId: chamado.clientId,
    createdAt: chamado.createdAt.toISOString(),
    updatedAt: chamado.updatedAt.toISOString(),
    requester: chamado.requester,
    assignee: chamado.assignee,
    client: chamado.client,
    linkedTask: chamado.linkedTask,
    commentCount: chamado._count.comments,
    attachmentCount: chamado._count.attachments,
  };
}
