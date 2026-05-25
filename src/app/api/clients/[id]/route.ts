import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  assertCategoryPermission,
  getReadableCategoryIds,
  PermissionDeniedError,
} from "@/lib/permissions";
import { clientUpdateSchema } from "@/lib/extract-types";
import { formatClientForApi } from "@/lib/client-fields";

const clientInclude = {
  categories: { include: { category: { select: { id: true, name: true } } } },
} as const;

import type { SessionUser } from "@/lib/auth";

async function getClientIfAllowed(id: string, user: SessionUser) {
  const readableIds = await getReadableCategoryIds(user);

  return prisma.client.findFirst({
    where: {
      id,
      categories: { some: { categoryId: { in: readableIds } } },
    },
    include: clientInclude,
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    const { id } = await params;
    const client = await getClientIfAllowed(id, user);
    if (!client) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }
    return NextResponse.json({ client: formatClientForApi(client) });
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    const { id } = await params;
    const existing = await getClientIfAllowed(id, user);
    if (!existing) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }

    const categoryId = existing.categories[0]?.categoryId;
    if (!categoryId) {
      return NextResponse.json({ error: "Cliente sem categoria" }, { status: 400 });
    }

    try {
      await assertCategoryPermission(user, categoryId, "canUpdate");
    } catch (err) {
      if (err instanceof PermissionDeniedError) {
        return NextResponse.json({ error: err.message }, { status: 403 });
      }
      throw err;
    }

    const body = await request.json();
    const parsed = clientUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const { categoryId: newCategoryId, ...data } = parsed.data;

    await prisma.client.update({
      where: { id },
      data,
    });

    if (newCategoryId && newCategoryId !== categoryId) {
      await assertCategoryPermission(user, newCategoryId, "canUpdate");
      await prisma.clientCategory.deleteMany({ where: { clientId: id } });
      await prisma.clientCategory.create({
        data: { clientId: id, categoryId: newCategoryId },
      });
    }

    const refreshed = await prisma.client.findUnique({
      where: { id },
      include: clientInclude,
    });

    return NextResponse.json({ client: formatClientForApi(refreshed!) });
  });
}
