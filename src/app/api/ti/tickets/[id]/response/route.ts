import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (user) => {
    if (user.role !== "TI" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito à equipe TI" }, { status: 403 });
    }

    const { id } = await params;
    const { message } = await request.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: "Mensagem é obrigatória" }, { status: 400 });
    }

    const ticket = await prisma.supportRequest.findUnique({ where: { id } });
    if (!ticket) {
      return NextResponse.json({ error: "Chamado não encontrado" }, { status: 404 });
    }

    const response = await prisma.supportTicketResponse.create({
      data: {
        ticketId: id,
        userId: user.id,
        message: message.trim(),
      },
    });

    await prisma.supportRequest.update({
      where: { id },
      data: {
        status: ticket.status === "ABERTO" ? "EM_ANDAMENTO" : ticket.status,
        assignedToId: ticket.assignedToId ?? user.id,
      },
    });

    if (ticket.requesterId) {
      await createNotification(prisma, {
        userId: ticket.requesterId,
        type: "GENERAL",
        title: "Resposta ao seu chamado",
        body: `${user.name} respondeu ao seu chamado: ${message.trim().slice(0, 80)}`,
        href: "/suporte",
      });
    }

    return NextResponse.json({ success: true, id: response.id });
  });
}
