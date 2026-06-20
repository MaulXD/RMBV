import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { saveAvatar, deleteAvatar } from "@/lib/avatar-storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withAuth(async (user) => {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo obrigatório" }, { status: 400 });
    }

    try {
      const current = await prisma.user.findUnique({
        where: { id: user.id },
        select: { avatarUrl: true },
      });

      const url = await saveAvatar(user.id, file);

      await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl: url },
      });

      if (current?.avatarUrl) {
        void deleteAvatar(current.avatarUrl);
      }

      return NextResponse.json({ avatarUrl: url });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha no upload";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  });
}

export async function DELETE() {
  return withAuth(async (user) => {
    const current = await prisma.user.findUnique({
      where: { id: user.id },
      select: { avatarUrl: true },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl: null },
    });

    if (current?.avatarUrl) {
      void deleteAvatar(current.avatarUrl);
    }

    return NextResponse.json({ ok: true });
  });
}
