import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  assertCategoryPermission,
  PermissionDeniedError,
} from "@/lib/permissions";
import { buildClientWhere, clientListInclude } from "@/lib/client-query";
import { resolveTeseForClient } from "@/lib/tese-sync";
import { extractionResultSchema } from "@/lib/extract-types";
import { formatClientForApi } from "@/lib/client-fields";
import { resolveTeamIdForCreate, TeamAccessError } from "@/lib/team-access";
import { z } from "zod";

const createClientSchema = extractionResultSchema.extend({
  categoryId: z.string().uuid(),
  teseId: z.string().uuid().optional().nullable(),
  status: z
    .enum(["AGUARDANDO", "LOCALIZADO", "SEM_SUCESSO", "TENTE_NOVAMENTE"])
    .optional(),
  rawExtractText: z.string().optional().nullable(),
});

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withAuth(async (user) => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const teseId = searchParams.get("teseId");
    const workflowStatus = searchParams.get("workflowStatus");
    const teamId = searchParams.get("teamId");

    const where = await buildClientWhere(user, { status, teseId, workflowStatus, teamId });

    const clients = await prisma.client.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: clientListInclude,
    });

    const rows = clients.map((client) => {
      const formatted = formatClientForApi(client);
      return {
        ...formatted,
        primaryPhone: client.phone1 ?? client.phone2 ?? null,
      };
    });

    return NextResponse.json({ clients: rows });
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

    const { categoryId, status, rawExtractText, teseId, tese, ...data } = parsed.data;

    try {
      await assertCategoryPermission(user, categoryId, "canCreate");
    } catch (err) {
      if (err instanceof PermissionDeniedError) {
        return NextResponse.json({ error: err.message }, { status: 403 });
      }
      throw err;
    }

    let teamId: string;
    try {
      teamId = await resolveTeamIdForCreate(user);
    } catch (err) {
      if (err instanceof TeamAccessError) {
        return NextResponse.json({ error: err.message }, { status: 403 });
      }
      throw err;
    }

    const teseData = await resolveTeseForClient({ teseId, tese, teamId });

    const client = await prisma.client.create({
      data: {
        ...data,
        ...teseData,
        teamId,
        status: status ?? "AGUARDANDO",
        rawExtractText: rawExtractText ?? null,
        createdById: user.id,
        categories: { create: [{ categoryId }] },
      },
      include: clientListInclude,
    });

    return NextResponse.json({ client: formatClientForApi(client) }, { status: 201 });
  });
}
