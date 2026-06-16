import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { normalizeCpf } from "./cpf-utils";

export type ClientDuplicateMatch = {
  id: string;
  name: string;
  cod: string | null;
  teseId: string | null;
  teseName: string | null;
  teamName: string | null;
};

export type ClientDuplicateInfo = {
  cpf: string | null;
  sameAction: ClientDuplicateMatch[];
  otherActions: ClientDuplicateMatch[];
};

function mapRow(client: {
  id: string;
  name: string;
  cod: string | null;
  teseId: string | null;
  tese: string | null;
  teseRef: { name: string } | null;
  team: { name: string } | null;
}): ClientDuplicateMatch {
  return {
    id: client.id,
    name: client.name,
    cod: client.cod,
    teseId: client.teseId,
    teseName: client.teseRef?.name ?? client.tese,
    teamName: client.team?.name ?? null,
  };
}

const duplicateInclude = {
  teseRef: { select: { name: true } },
  team: { select: { name: true } },
} as const;

export async function findClientDuplicates(params: {
  cpf: string | null | undefined;
  teseId: string | null | undefined;
  excludeClientId?: string;
  teamScope?: Prisma.ClientWhereInput;
}): Promise<ClientDuplicateInfo> {
  const normalized = normalizeCpf(params.cpf);
  if (!normalized) {
    return { cpf: null, sameAction: [], otherActions: [] };
  }

  const baseWhere: Prisma.ClientWhereInput = {
    ...(params.teamScope ?? {}),
    ...(params.excludeClientId ? { id: { not: params.excludeClientId } } : {}),
    OR: [
      { cpf: normalized },
      { cpf: { contains: normalized } },
    ],
  };

  const rows = await prisma.client.findMany({
    where: baseWhere,
    select: {
      id: true,
      name: true,
      cod: true,
      cpf: true,
      teseId: true,
      tese: true,
      teseRef: duplicateInclude.teseRef,
      team: duplicateInclude.team,
    },
    orderBy: { name: "asc" },
    take: 20,
  });

  const filtered = rows.filter((row) => normalizeCpf(row.cpf) === normalized);
  const sameAction: ClientDuplicateMatch[] = [];
  const otherActions: ClientDuplicateMatch[] = [];

  for (const row of filtered) {
    const mapped = mapRow(row);
    if (params.teseId && row.teseId === params.teseId) {
      sameAction.push(mapped);
    } else {
      otherActions.push(mapped);
    }
  }

  return { cpf: normalized, sameAction, otherActions };
}
