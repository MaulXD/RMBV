import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getClientIfAllowed } from "@/lib/client-access";
import {
  assertCategoryPermission,
  PermissionDeniedError,
} from "@/lib/permissions";
import { formatHistoryEntry, isPhoneFieldKey } from "@/lib/client-history";

export const runtime = "nodejs";

function getClientPhoneValue(
  client: { phone1: string | null; phone2: string | null; phone3: string | null; phone4: string | null; phone5: string | null; phone6: string | null; phone7: string | null; phone8: string | null; phone9: string | null; phone10: string | null },
  key: string
): string | null {
  if (!isPhoneFieldKey(key)) return null;
  const map: Record<string, string | null | undefined> = {
    phone1: client.phone1,
    phone2: client.phone2,
    phone3: client.phone3,
    phone4: client.phone4,
    phone5: client.phone5,
    phone6: client.phone6,
    phone7: client.phone7,
    phone8: client.phone8,
    phone9: client.phone9,
    phone10: client.phone10,
  };
  return map[key]?.trim() || null;
}

const phoneCheckSchema = z.object({
  phoneKey: z.string().refine(isPhoneFieldKey, "Telefone inválido"),
  result: z.enum(["VALIDO", "INVALIDO", "NAO_ATENDE"]),
  phoneNumber: z.string().min(8).optional(),
  applyToField: z.boolean().optional(),
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
      return NextResponse.json(
        { error: "Cliente finalizado não pode ser alterado" },
        { status: 400 }
      );
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
    const parsed = phoneCheckSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const { phoneKey, result, phoneNumber: bodyPhone, applyToField } = parsed.data;
    let phoneNumber = getClientPhoneValue(existing, phoneKey);

    if (bodyPhone?.trim()) {
      phoneNumber = bodyPhone.trim();
    }

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "Preencha o número antes de marcar a verificação" },
        { status: 400 }
      );
    }

    if (applyToField) {
      await prisma.client.update({
        where: { id },
        data: { [phoneKey]: phoneNumber },
      });
    }

    const row = await prisma.clientHistory.create({
      data: {
        clientId: id,
        type: "PHONE_CHECK",
        createdById: user.id,
        phoneKey,
        phoneNumber,
        phoneCheck: result,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ entry: formatHistoryEntry(row) });
  });
}
