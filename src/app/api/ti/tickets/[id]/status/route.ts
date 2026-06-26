import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (user) => {
    if (user.role !== "TI" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito à equipe TI" }, { status: 403 });
    }

    const { id } = await params;
    const { status, message } = await request.json() as { status: string; message?: string };

    if (!["ABERTO", "EM_ANDAMENTO", "RESOLVIDO", "FECHADO"].includes(status)) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    }

    const ticket = await prisma.supportRequest.findUnique({ where: { id } });
    if (!ticket) {
      return NextResponse.json({ error: "Chamado não encontrado" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.supportRequest.update({
        where: { id },
        data: { status: status as "ABERTO" | "EM_ANDAMENTO" | "RESOLVIDO" | "FECHADO" },
      });

      if (message?.trim()) {
        await tx.supportTicketResponse.create({
          data: {
            ticketId: id,
            userId: user.id,
            message: message.trim(),
          },
        });
      }
    });

    if (message?.trim() && ticket.requesterId) {
      await createNotification(prisma, {
        userId: ticket.requesterId,
        type: "GENERAL",
        title: status === "RESOLVIDO" ? "Chamado resolvido" : "Chamado atualizado",
        body: `${user.name}: ${message.trim().slice(0, 80)}`,
        href: "/suporte",
      });
    }

    return NextResponse.json({ success: true });
  });
}
