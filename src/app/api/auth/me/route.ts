import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
export const runtime = "nodejs";

export async function GET() {
  return withAuth(async (user) => NextResponse.json({ user }));
}
