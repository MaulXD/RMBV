import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { debugPjeForm, PJE_COURTS } from "@/lib/pje-scraper";

export const runtime = "nodejs";

// Debug endpoint — shows the actual form fields from PJe page so we can fix field names
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const tribunal = (searchParams.get("tribunal") ?? "trf5") as keyof typeof PJE_COURTS;

  try {
    const result = await debugPjeForm(tribunal);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
