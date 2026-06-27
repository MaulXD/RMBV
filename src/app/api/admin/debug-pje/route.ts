import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { debugPjeForm, PJE_COURTS } from "@/lib/pje-scraper";
import { searchCPFOnPJeDebug } from "@/lib/pje-scraper";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const tribunal = (searchParams.get("tribunal") ?? "trf5") as keyof typeof PJE_COURTS;
  const cpf = searchParams.get("cpf");

  try {
    if (cpf) {
      const result = await searchCPFOnPJeDebug(cpf.replace(/\D/g, ""), tribunal);
      return NextResponse.json(result);
    }
    const result = await debugPjeForm(tribunal);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
