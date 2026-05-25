import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";
export const runtime = "nodejs";

export async function POST(request: Request) {
  await clearSessionCookie();
  return NextResponse.redirect(new URL("/login", request.url));
}
