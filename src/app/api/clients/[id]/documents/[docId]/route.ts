import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { getClientIfAllowed } from "@/lib/client-access";
import {
  readClientDocument,
  deleteClientDocumentFile,
} from "@/lib/document-storage";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  return withAuth(async (user) => {
    const { id: clientId, docId } = await params;
    const client = await getClientIfAllowed(clientId, user);
    if (!client) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }

    const document = await prisma.clientDocument.findFirst({
      where: { id: docId, clientId },
    });
    if (!document) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
    }

    try {
      const buffer = await readClientDocument(clientId, document.storedName);
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": document.mimeType,
          "Content-Disposition": `attachment; filename="${encodeURIComponent(document.originalName)}"`,
          "Content-Length": String(document.size),
        },
      });
    } catch {
      return NextResponse.json({ error: "Arquivo não encontrado no servidor" }, { status: 404 });
    }
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  return withAuth(async (user) => {
    if (!isAdmin(user)) {
      return NextResponse.json(
        { error: "Somente administradores podem excluir documentos" },
        { status: 403 }
      );
    }

    const { id: clientId, docId } = await params;
    const client = await getClientIfAllowed(clientId, user);
    if (!client) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }

    const document = await prisma.clientDocument.findFirst({
      where: { id: docId, clientId },
    });
    if (!document) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
    }

    await deleteClientDocumentFile(clientId, document.storedName);
    await prisma.clientDocument.delete({ where: { id: docId } });

    return NextResponse.json({ ok: true });
  });
}
