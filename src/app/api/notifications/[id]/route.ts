import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    const { id } = await params;
    const updated = await prisma.notification.updateMany({
      where: { id, userId: user.id },
      data: { read: true },
    });
    if (updated.count === 0) {
      return NextResponse.json({ error: "Notificação não encontrada" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  });
}
