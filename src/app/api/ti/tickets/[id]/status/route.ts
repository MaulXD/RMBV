import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (user) => {
    if (user.role !== "TI" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito à equipe TI" }, { status: 403 });
    }

    const { id } = await params;
    const { status } = await request.json();

    if (!["ABERTO", "EM_ANDAMENTO", "RESOLVIDO", "FECHADO"].includes(status)) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    }

    const ticket = await prisma.supportRequest.findUnique({ where: { id } });
    if (!ticket) {
      return NextResponse.json({ error: "Chamado não encontrado" }, { status: 404 });
    }

    await prisma.supportRequest.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ success: true });
  });
}
