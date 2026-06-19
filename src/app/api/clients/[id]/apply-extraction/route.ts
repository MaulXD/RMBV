import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getClientIfAllowed } from "@/lib/client-access";
import {
  assertCategoryPermission,
  PermissionDeniedError,
} from "@/lib/permissions";
import { clientDetailInclude as clientListInclude } from "@/lib/client-query";
import { formatClientForApi } from "@/lib/client-fields";
import { clientUpdateSchema } from "@/lib/client-schema";
import { isPhoneFieldKey } from "@/lib/client-history";

export const runtime = "nodejs";

const applySchema = z.object({
  fields: z.record(z.string()).default({}),
  phoneChecks: z
    .array(
      z.object({
        phoneKey: z.string().refine(isPhoneFieldKey, "Telefone inválido"),
        phoneNumber: z.string().min(8),
        result: z.enum(["VALIDO", "INVALIDO", "NAO_ATENDE"]).default("VALIDO"),
      })
    )
    .default([]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    const { id } = await params;
    const existing = await getClientIfAllowed(id, user);
    if (!existing) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }

    if (existing.workflowStatus === "FINALIZADO") {
      return NextResponse.json({ error: "Cliente finalizado não pode ser alterado" }, { status: 400 });
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
    const parsed = applySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const { fields, phoneChecks } = parsed.data;
    const fieldParsed = clientUpdateSchema.safeParse(fields);
    if (!fieldParsed.success) {
      return NextResponse.json({ error: "Campos inválidos para o cliente" }, { status: 400 });
    }

    const client = await prisma.$transaction(async (tx) => {
      const updated =
        Object.keys(fieldParsed.data).length > 0
          ? await tx.client.update({
              where: { id },
              data: fieldParsed.data,
            })
          : existing;

      for (const check of phoneChecks) {
        await tx.clientHistory.create({
          data: {
            clientId: id,
            type: "PHONE_CHECK",
            createdById: user.id,
            phoneKey: check.phoneKey,
            phoneNumber: check.phoneNumber,
            phoneCheck: check.result,
          },
        });
      }

      return tx.client.findUnique({
        where: { id: updated.id },
        include: clientListInclude,
      });
    });

    if (!client) {
      return NextResponse.json({ error: "Falha ao aplicar extração" }, { status: 500 });
    }

    return NextResponse.json({
      client: formatClientForApi(client),
      appliedFields: Object.keys(fieldParsed.data),
      phoneChecksCount: phoneChecks.length,
    });
  });
}
