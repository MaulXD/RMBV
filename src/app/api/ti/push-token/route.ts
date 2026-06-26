import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withAuth(async (user) => {
    const { token, platform } = await request.json() as { token: string; platform: string };

    const existing = await prisma.user.findUnique({
      where: { id: user.id },
      select: { pushTokens: true },
    });

    const tokens: string[] = (existing?.pushTokens as string[]) ?? [];
    if (!tokens.includes(token)) {
      tokens.push(token);
      await prisma.user.update({
        where: { id: user.id },
        data: { pushTokens: tokens },
      });
    }

    console.log(`[PushToken] User ${user.id} (${user.role}): ${platform} token registered (total: ${tokens.length + (tokens.includes(token) ? 0 : 1)})`);
    return NextResponse.json({ success: true });
  });
}

export async function DELETE(request: Request) {
  return withAuth(async (user) => {
    const { token } = await request.json() as { token: string };

    const existing = await prisma.user.findUnique({
      where: { id: user.id },
      select: { pushTokens: true },
    });

    const tokens: string[] = ((existing?.pushTokens as string[]) ?? []).filter((t: string) => t !== token);
    await prisma.user.update({
      where: { id: user.id },
      data: { pushTokens: tokens },
    });

    console.log(`[PushToken] User ${user.id} (${user.role}): token removed`);
    return NextResponse.json({ success: true });
  });
}
