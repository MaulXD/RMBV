import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api";
import { findClientDuplicates } from "@/lib/client-duplicates";
import { teamScopeWhere } from "@/lib/team-access";

export const runtime = "nodejs";

const checkSchema = z.object({
  cpf: z.string().optional().nullable(),
  teseId: z.string().uuid().optional().nullable(),
  excludeClientId: z.string().uuid().optional().nullable(),
});

export async function POST(request: Request) {
  return withAuth(async (user) => {
    const body = await request.json();
    const parsed = checkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const info = await findClientDuplicates({
      cpf: parsed.data.cpf,
      teseId: parsed.data.teseId,
      excludeClientId: parsed.data.excludeClientId ?? undefined,
      teamScope: teamScopeWhere(user),
    });

    return NextResponse.json({
      ...info,
      isDuplicateInSameAction: info.sameAction.length > 0,
      hasOtherActions: info.otherActions.length > 0,
    });
  });
}
