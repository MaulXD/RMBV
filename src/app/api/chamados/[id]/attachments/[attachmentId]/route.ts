import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getChamadoIfAllowed } from "@/lib/chamado-access";
import { readChamadoAttachment } from "@/lib/chamado-storage";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  return withAuth(async (user) => {
    const { id, attachmentId } = await params;
    const chamado = await getChamadoIfAllowed(id, user);
    if (!chamado) {
      return NextResponse.json({ error: "Chamado não encontrado" }, { status: 404 });
    }

    const attachment = await prisma.chamadoAttachment.findFirst({
      where: { id: attachmentId, chamadoId: id },
    });
    if (!attachment) {
      return NextResponse.json({ error: "Anexo não encontrado" }, { status: 404 });
    }

    try {
      const buffer = await readChamadoAttachment(id, attachment.storedName);
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": attachment.mimeType,
          "Content-Disposition": `attachment; filename="${encodeURIComponent(attachment.originalName)}"`,
          "Content-Length": String(buffer.length),
        },
      });
    } catch {
      return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
    }
  });
}
