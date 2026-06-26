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
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "userId é obrigatório" }, { status: 400 });
    }

    const ticket = await prisma.supportRequest.findUnique({ where: { id } });
    if (!ticket) {
      return NextResponse.json({ error: "Chamado não encontrado" }, { status: 404 });
    }

    await prisma.supportRequest.update({
      where: { id },
      data: {
        assignedToId: userId,
        status: ticket.status === "ABERTO" ? "EM_ANDAMENTO" : ticket.status,
      },
    });

    return NextResponse.json({ success: true });
  });
}
