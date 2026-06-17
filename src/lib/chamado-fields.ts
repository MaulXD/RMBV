import type { ChamadoCategory, ChamadoStatus, TaskPriority } from "@prisma/client";

export type ChamadoListItem = {
  id: string;
  number: number;
  title: string;
  description: string | null;
  status: ChamadoStatus;
  priority: TaskPriority;
  category: ChamadoCategory;
  teamId: string;
  requesterId: string;
  assigneeId: string | null;
  clientId: string | null;
  createdAt: string;
  updatedAt: string;
  requester: { id: string; name: string };
  assignee: { id: string; name: string } | null;
  client: { id: string; name: string; cod: string | null } | null;
  linkedTask: { id: string; title: string } | null;
  commentCount: number;
  attachmentCount: number;
};
