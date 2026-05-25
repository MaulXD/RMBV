import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  assertCategoryPermission,
  getReadableCategoryIds,
  PermissionDeniedError,
} from "@/lib/permissions";
import { extractionResultSchema } from "@/lib/extract-types";
import { formatClientForApi } from "@/lib/client-fields";
import { z } from "zod";

const createClientSchema = extractionResultSchema.extend({
  categoryId: z.string().uuid(),
  status: z
    .enum(["AGUARDANDO", "LOCALIZADO", "SEM_SUCESSO", "TENTE_NOVAMENTE"])
    .optional(),
});

const clientInclude = {
  categories: { include: { category: { select: { id: true, name: true } } } },
} as const;

export async function GET(request: Request) {
  return withAuth(async (user) => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const readableIds = await getReadableCategoryIds(user);

    const clients = await prisma.client.findMany({
      where: {
        categories: { some: { categoryId: { in: readableIds } } },
        ...(status
          ? {
              status: status as
                | "AGUARDANDO"
                | "LOCALIZADO"
                | "SEM_SUCESSO"
                | "TENTE_NOVAMENTE",
            }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
      include: clientInclude,
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

    const { categoryId, status, ...data } = parsed.data;

    try {
      await assertCategoryPermission(user, categoryId, "canCreate");
    } catch (err) {
      if (err instanceof PermissionDeniedError) {
        return NextResponse.json({ error: err.message }, { status: 403 });
      }
      throw err;
    }

    const client = await prisma.client.create({
      data: {
        ...data,
        status: status ?? "AGUARDANDO",
        createdById: user.id,
        categories: { create: [{ categoryId }] },
      },
      include: clientInclude,
    });

    return NextResponse.json({ client: formatClientForApi(client) }, { status: 201 });
  });
}
