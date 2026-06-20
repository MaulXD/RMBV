import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getClientIfAllowed } from "@/lib/client-access";
import { saveClientDocument } from "@/lib/document-storage";
import { runAutomations } from "@/lib/automations";
import { notifyTeam } from "@/lib/notifications";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    const { id: clientId } = await params;
    const client = await getClientIfAllowed(clientId, user);
    if (!client) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }

    const documents = await prisma.clientDocument.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      include: {
        uploadedBy: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({
      documents: documents.map((doc) => ({
        id: doc.id,
        originalName: doc.originalName,
        mimeType: doc.mimeType,
        size: doc.size,
        tags: (() => { try { return JSON.parse(doc.tags ?? "[]") as string[]; } catch { return []; } })(),
        createdAt: doc.createdAt.toISOString(),
        uploadedBy: doc.uploadedBy,
        downloadUrl: `/api/clients/${clientId}/documents/${doc.id}`,
      })),
    });
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    const { id: clientId } = await params;
    const client = await getClientIfAllowed(clientId, user);
    if (!client) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo obrigatório" }, { status: 400 });
    }

    const tagsRaw = formData.get("tags");
    let tags = "[]";
    if (tagsRaw) {
      try { tags = JSON.stringify(JSON.parse(tagsRaw as string)); } catch { tags = "[]"; }
    }

    try {
      const { storedName, mimeType, size } = await saveClientDocument(clientId, file);

      const document = await prisma.$transaction(async (tx) => {
        const doc = await tx.clientDocument.create({
          data: {
            clientId,
            storedName,
            originalName: file.name || "documento",
            mimeType,
            size,
            tags,
            uploadedById: user.id,
          },
          include: {
            uploadedBy: { select: { id: true, name: true, email: true } },
          },
        });

        if (client.teamId) {
          await runAutomations(tx, "DOCUMENT_UPLOADED", {
            teamId: client.teamId,
            actorId: user.id,
            clientId,
            clientName: client.name,
            documentName: doc.originalName,
          });
          await notifyTeam(tx, client.teamId, {
            type: "CLIENT_DOCUMENT",
            title: "Novo documento",
            body: `${doc.originalName} — ${client.name}`,
            href: `/clients/${clientId}`,
          }, user.id);
        }

        return doc;
      });

      return NextResponse.json(
        {
          document: {
            id: document.id,
            originalName: document.originalName,
            mimeType: document.mimeType,
            size: document.size,
            tags: JSON.parse(document.tags ?? "[]") as string[],
            createdAt: document.createdAt.toISOString(),
            uploadedBy: document.uploadedBy,
            downloadUrl: `/api/clients/${clientId}/documents/${document.id}`,
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
