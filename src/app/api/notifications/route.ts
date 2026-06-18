import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  return withAuth(async (user) => {
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 40,
      }),
      prisma.notification.count({ where: { userId: user.id, read: false } }),
    ]);
    return NextResponse.json({ notifications, unreadCount });
  });
}

export async function PATCH() {
  return withAuth(async (user) => {
    await prisma.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    });
    return NextResponse.json({ ok: true });
  });
}
