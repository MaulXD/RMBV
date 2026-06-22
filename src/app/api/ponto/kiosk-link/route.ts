import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { isAdmin } from "@/lib/admin";
import { getKioskApiKey } from "@/lib/kiosk-auth";

export const runtime = "nodejs";

/** Gera URL do quiosque com chave — só para usuários autenticados da equipe. */
export async function GET(request: Request) {
  return withAuth(async (user) => {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");

    if (!teamId) {
      return NextResponse.json({ error: "teamId obrigatório" }, { status: 400 });
    }

    if (!isAdmin(user) && user.teamId !== teamId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const kioskKey = getKioskApiKey();
    if (!kioskKey) {
      return NextResponse.json(
        { error: "Configure KIOSK_API_KEY no servidor" },
        { status: 503 },
      );
    }

    const origin = new URL(request.url).origin;
    const url = `${origin}/kiosk?teamId=${encodeURIComponent(teamId)}&kioskKey=${encodeURIComponent(kioskKey)}`;

    return NextResponse.json({ url });
  });
}
