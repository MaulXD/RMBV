import type { Prisma } from "@prisma/client";
import type { SessionUser } from "./auth";
import { getReadableCategoryIds } from "./permissions";

export type ClientListFilters = {
  status?: string | null;
  teseId?: string | null;
};

export async function buildClientWhere(
  user: SessionUser,
  filters: ClientListFilters
): Promise<Prisma.ClientWhereInput> {
  const readableIds = await getReadableCategoryIds(user);

  return {
    categories: { some: { categoryId: { in: readableIds } } },
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
  };
}

export const clientListInclude = {
  categories: { include: { category: { select: { id: true, name: true } } } },
  teseRef: { select: { id: true, name: true, color: true } },
} as const;
