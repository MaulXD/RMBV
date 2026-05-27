import type { Prisma } from "@prisma/client";
import type { SessionUser } from "./auth";
import { getReadableCategoryIds } from "./permissions";
import { teamScopeWhere } from "./team-access";

export type ClientListFilters = {
  status?: string | null;
  teseId?: string | null;
  workflowStatus?: string | null;
  teamId?: string | null;
};

export async function buildClientWhere(
  user: SessionUser,
  filters: ClientListFilters
): Promise<Prisma.ClientWhereInput> {
  const readableIds = await getReadableCategoryIds(user);

  return {
    ...teamScopeWhere(user),
    categories: { some: { categoryId: { in: readableIds } } },
    ...(filters.teamId && user.role === "ADMIN" ? { teamId: filters.teamId } : {}),
    ...(filters.status
      ? {
          status: filters.status as
            | "AGUARDANDO"
            | "LOCALIZADO"
            | "SEM_SUCESSO"
            | "TENTE_NOVAMENTE",
        }
      : {}),
    ...(filters.teseId ? { teseId: filters.teseId } : {}),
    ...(filters.workflowStatus
      ? {
          workflowStatus: filters.workflowStatus as
            | "EM_ANDAMENTO"
            | "FINALIZACAO_SOLICITADA"
            | "FINALIZADO",
        }
      : {}),
  };
}

export const clientListInclude = {
  categories: { include: { category: { select: { id: true, name: true } } } },
  teseRef: { select: { id: true, name: true, color: true } },
  finalizationRequestedBy: { select: { id: true, name: true, email: true } },
  finalizedBy: { select: { id: true, name: true, email: true } },
} as const;
