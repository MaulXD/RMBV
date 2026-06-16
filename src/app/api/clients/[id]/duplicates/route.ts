import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { getClientIfAllowed } from "@/lib/client-access";
import { findClientDuplicates } from "@/lib/client-duplicates";
import { teamScopeWhere } from "@/lib/team-access";

export const runtime = "nodejs";

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

    const info = await findClientDuplicates({
      cpf: client.cpf,
      teseId: client.teseId,
      excludeClientId: client.id,
      teamScope: teamScopeWhere(user),
    });

    return NextResponse.json(info);
  });
}
