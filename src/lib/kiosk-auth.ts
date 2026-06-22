import { NextResponse } from "next/server";

const KIOSK_HEADER = "x-kiosk-key";

/** Chave compartilhada entre servidor e tablets do quiosque (não expõe descritores faciais). */
export function getKioskApiKey(): string {
  const key = process.env.KIOSK_API_KEY;
  if (key) return key;
  if (process.env.NODE_ENV === "development") return "dev-kiosk-key";
  return "";
}

export function readKioskKeyFromRequest(request: Request): string | null {
  const header = request.headers.get(KIOSK_HEADER);
  if (header) return header;

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("kioskKey");
  return query || null;
}

export function isValidKioskKey(provided: string | null): boolean {
  const expected = getKioskApiKey();
  if (!expected || !provided) return false;
  return provided === expected;
}

export function kioskUnauthorizedResponse() {
  return NextResponse.json(
    { error: "Chave do quiosque inválida ou ausente" },
    { status: 401 },
  );
}

export function assertKioskRequest(request: Request): NextResponse | null {
  if (!getKioskApiKey()) {
    return NextResponse.json(
      { error: "Quiosque não configurado (KIOSK_API_KEY)" },
      { status: 503 },
    );
  }
  if (!isValidKioskKey(readKioskKeyFromRequest(request))) {
    return kioskUnauthorizedResponse();
  }
  return null;
}
