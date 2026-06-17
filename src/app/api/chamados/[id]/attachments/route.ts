import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getChamadoIfAllowed } from "@/lib/chamado-access";
import { saveChamadoAttachment } from "@/lib/chamado-storage";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    const { id } = await params;
    const chamado = await getChamadoIfAllowed(id, user);
    if (!chamado) {
      return NextResponse.json({ error: "Chamado não encontrado" }, { status: 404 });
    }

    const attachments = await prisma.chamadoAttachment.findMany({
      where: { chamadoId: id },
      orderBy: { createdAt: "desc" },
      include: { uploadedBy: { select: { id: true, name: true } } },
    });

    return NextResponse.json({
      attachments: attachments.map((a) => ({
        id: a.id,
        originalName: a.originalName,
        mimeType: a.mimeType,
        size: a.size,
        createdAt: a.createdAt.toISOString(),
        uploadedBy: a.uploadedBy,
        downloadUrl: `/api/chamados/${id}/attachments/${a.id}`,
      })),
    });
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    const { id } = await params;
    const chamado = await getChamadoIfAllowed(id, user);
    if (!chamado) {
      return NextResponse.json({ error: "Chamado não encontrado" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo obrigatório" }, { status: 400 });
    }

    try {
      const { storedName } = await saveChamadoAttachment(id, file);

      const attachment = await prisma.chamadoAttachment.create({
        data: {
          chamadoId: id,
          storedName,
          originalName: file.name || "anexo",
          mimeType: file.type || "application/octet-stream",
          size: file.size,
          uploadedById: user.id,
        },
        include: { uploadedBy: { select: { id: true, name: true } } },
      });

      return NextResponse.json(
        {
          attachment: {
            id: attachment.id,
            originalName: attachment.originalName,
            mimeType: attachment.mimeType,
            size: attachment.size,
            createdAt: attachment.createdAt.toISOString(),
            uploadedBy: attachment.uploadedBy,
            downloadUrl: `/api/chamados/${id}/attachments/${attachment.id}`,
          },
        },
        { status: 201 }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha no upload";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  });
}
