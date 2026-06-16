import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  assertCategoryPermission,
  PermissionDeniedError,
} from "@/lib/permissions";
import { buildClientWhere, clientListInclude } from "@/lib/client-query";
import {
  DEFAULT_CLIENT_PAGE_SIZE,
  normalizeClientPage,
  normalizeClientPageSize,
} from "@/lib/client-pagination";
import { resolveTeseForClient } from "@/lib/tese-sync";
import { clientDataSchema } from "@/lib/client-schema";
import { formatClientForApi } from "@/lib/client-fields";
import { findClientDuplicates } from "@/lib/client-duplicates";
import { teamScopeWhere } from "@/lib/team-access";
import { isAdminUser, resolveTeamIdForCreate, TeamAccessError } from "@/lib/team-access";
import { z } from "zod";

const createClientSchema = clientDataSchema.extend({
  categoryId: z.string().uuid(),
  teamId: z.string().uuid().optional().nullable(),
  teseId: z.string().uuid().optional().nullable(),
  pesquisa: z.string().optional().nullable(),
  status: z
    .enum(["AGUARDANDO", "LOCALIZADO", "SEM_SUCESSO", "TENTE_NOVAMENTE"])
    .optional(),
});

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withAuth(async (user) => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const teseId = searchParams.get("teseId");
    const workflowStatus = searchParams.get("workflowStatus");
    const teamId = searchParams.get("teamId");
    const search = searchParams.get("search");
    const page = normalizeClientPage(searchParams.get("page"));
    const pageSize = normalizeClientPageSize(
      searchParams.get("pageSize") ?? DEFAULT_CLIENT_PAGE_SIZE
    );

    const where = await buildClientWhere(user, {
      status,
      teseId,
      workflowStatus,
      teamId,
      search,
    });

    const total = await prisma.client.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);

    const clients = await prisma.client.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (safePage - 1) * pageSize,
      take: pageSize,
      include: clientListInclude,
    });

    const formattedRows = clients.map((client) => {
      const formatted = formatClientForApi(client);
      return {
        ...formatted,
        primaryPhone: client.phone1 ?? client.phone2 ?? null,
      };
    });

    return NextResponse.json({
      clients: formattedRows,
      total,
      page: safePage,
      pageSize,
      totalPages,
    });
  });
}

export async function POST(request: Request) {
  return withAuth(async (user) => {
    const body = await request.json();
    const parsed = createClientSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { categoryId, status, teamId: bodyTeamId, teseId, tese, pesquisa, ...data } = parsed.data;

    try {
      await assertCategoryPermission(user, categoryId, "canCreate");
    } catch (err) {
      if (err instanceof PermissionDeniedError) {
        return NextResponse.json({ error: err.message }, { status: 403 });
      }
      throw err;
    }

    let explicitTeamId = bodyTeamId ?? null;
    if (isAdminUser(user) && !explicitTeamId && teseId) {
      const teseRow = await prisma.tese.findUnique({
        where: { id: teseId },
        select: { teamId: true },
      });
      explicitTeamId = teseRow?.teamId ?? null;
    }

    let teamId: string;
    try {
      teamId = await resolveTeamIdForCreate(user, explicitTeamId);
    } catch (err) {
      if (err instanceof TeamAccessError) {
        return NextResponse.json({ error: err.message }, { status: 403 });
      }
      throw err;
    }

    const teseData = await resolveTeseForClient({ teseId, tese, teamId });

    const dupes = await findClientDuplicates({
      cpf: data.cpf,
      teseId: teseData.teseId ?? teseId,
      teamScope: teamScopeWhere(user),
    });
    if (dupes.sameAction.length > 0) {
      return NextResponse.json(
        {
          error: "Já existe um cliente com este CPF nesta mesma ação (tese).",
          duplicates: dupes,
        },
        { status: 409 }
      );
    }

    const client = await prisma.client.create({
      data: {
        ...data,
        ...teseData,
        teamId,
        pesquisa: pesquisa ?? null,
        status: status ?? "AGUARDANDO",
        createdById: user.id,
        categories: { create: [{ categoryId }] },
      },
      include: clientListInclude,
    });

    return NextResponse.json(
      {
        client: formatClientForApi(client),
        otherActions: dupes.otherActions,
      },
      { status: 201 }
    );
  });
}
