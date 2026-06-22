import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Removido — descritores biométricos não são mais expostos publicamente. Use POST /api/ponto/match. */
export async function GET() {
  return NextResponse.json(
    {
      error: "Endpoint descontinuado. Use o quiosque com link gerado em Ponto → Link do quiosque.",
    },
    { status: 410 },
  );
}
