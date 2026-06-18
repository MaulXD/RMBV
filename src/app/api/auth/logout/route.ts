import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";
export const runtime = "nodejs";

export async function POST(request: Request) {
  await clearSessionCookie();
  // 303 forces GET on redirect — 307 would re-POST to "/" and return 405
  return NextResponse.redirect(new URL("/", request.url), 303);
}
