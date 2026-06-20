import type { Prisma } from "@prisma/client";
import type { SessionUser } from "./auth";
import { getReadableCategoryIds } from "./permissions";
import { teamScopeWhere } from "./team-access";

export type ClientListFilters = {
  status?: string | null;
  teseId?: string | null;
  noTese?: boolean;
  workflowStatus?: string | null;
  teamId?: string | null;
  search?: string | null;
  followUpDue?: boolean;
};

function buildClientSearchWhere(search: string): Prisma.ClientWhereInput {
  const term = search.trim();
  if (!term) return {};

  const digits = term.replace(/\D/g, "");
  const or: Prisma.ClientWhereInput[] = [
    { name: { contains: term, mode: "insensitive" } },
    { cod: { contains: term, mode: "insensitive" } },
    { tese: { contains: term, mode: "insensitive" } },
    { cpf: { contains: term, mode: "insensitive" } },
    { phone1: { contains: term, mode: "insensitive" } },
    { phone2: { contains: term, mode: "insensitive" } },
    { phone3: { contains: term, mode: "insensitive" } },
    { phone4: { contains: term, mode: "insensitive" } },
    { phone5: { contains: term, mode: "insensitive" } },
    { phone6: { contains: term, mode: "insensitive" } },
    { phone7: { contains: term, mode: "insensitive" } },
    { phone8: { contains: term, mode: "insensitive" } },
    { phone9: { contains: term, mode: "insensitive" } },
    { phone10: { contains: term, mode: "insensitive" } },
  ];

  if (digits.length >= 3) {
    or.push({ cpf: { contains: digits } });
  }

  return { OR: or };
}

export async function buildClientWhere(
  user: SessionUser,
  filters: ClientListFilters
): Promise<Prisma.ClientWhereInput> {
  const readableIds = await getReadableCategoryIds(user);
  const searchWhere = filters.search ? buildClientSearchWhere(filters.search) : {};

  return {
    ...teamScopeWhere(user),
    ...searchWhere,
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
    ...(filters.noTese ? { teseId: null } : filters.teseId ? { teseId: filters.teseId } : {}),
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

// Lightweight include for list views — no heavy user JOINs
export const clientListInclude = {
  categories: { include: { category: { select: { id: true, name: true } } } },
  teseRef: { select: { id: true, name: true, color: true } },
} as const;

// Full include for profile/finalization routes that need user relations
export const clientDetailInclude = {
  categories: { include: { category: { select: { id: true, name: true } } } },
  teseRef: { select: { id: true, name: true, color: true } },
  finalizationRequestedBy: { select: { id: true, name: true, email: true } },
  finalizedBy: { select: { id: true, name: true, email: true } },
} as const;
