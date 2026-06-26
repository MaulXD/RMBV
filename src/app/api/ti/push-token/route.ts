import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withAuth(async (user) => {
    const { token, platform } = await request.json() as { token: string; platform: string };
    console.log(`[PushToken] User ${user.id} (${user.role}): ${platform} token registered`);
    return NextResponse.json({ success: true });
  });
}
