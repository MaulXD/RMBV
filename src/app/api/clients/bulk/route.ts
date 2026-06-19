import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
});

export async function DELETE(request: Request) {
  return withAuth(async (user) => {
    if (user.role !== "ADV" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = bulkDeleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "IDs inválidos" }, { status: 400 });
    }

    const { ids } = parsed.data;

    const where =
      user.role === "ADMIN"
        ? { id: { in: ids } }
        : { id: { in: ids }, teamId: user.teamId ?? "__none__" };

    const { count } = await prisma.client.deleteMany({ where });

    return NextResponse.json({ deleted: count });
  });
}
