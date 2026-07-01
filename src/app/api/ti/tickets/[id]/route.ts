import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (user) => {
    if (user.role !== "TI" && user.role !== "ADMIN" && user.role !== "SUPORTE") {
      return NextResponse.json({ error: "Acesso restrito à equipe TI" }, { status: 403 });
    }

    const { id } = await params;

    const ticket = await prisma.supportRequest.findUnique({
      where: { id },
      include: {
        requester: { select: { name: true, email: true } },
        assignedTo: { select: { name: true, email: true } },
        responses: {
          orderBy: { createdAt: "asc" },
          include: { user: { select: { name: true, email: true } } },
        },
        statusHistory: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Chamado não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ ticket });
  });
}
