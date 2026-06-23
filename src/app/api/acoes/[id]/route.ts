import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api";

export const runtime = "nodejs";

const ALLOWED_ROLES = ["ADMIN", "ADV", "GERENTE"] as const;

const acaoInclude = {
  client: { select: { id: true, name: true, cod: true } },
  createdBy: { select: { id: true, name: true } },
  advConfirmadoBy: { select: { id: true, name: true } },
  docsEnviadosBy: { select: { id: true, name: true } },
  entradaBy: { select: { id: true, name: true } },
  sentencaBy: { select: { id: true, name: true } },
} as const;

const patchSchema = z.object({
  numCNJ: z.string().optional().nullable(),
  valorCausa: z.number().optional().nullable(),
  // Stage toggles — pass true to mark now, false to clear
  advConfirmado: z.boolean().optional(),
  advNota: z.string().optional().nullable(),
  docsEnviados: z.boolean().optional(),
  docsNota: z.string().optional().nullable(),
  entrada: z.boolean().optional(),
  entradaNota: z.string().optional().nullable(),
  sentenca: z.boolean().optional(),
  sentencaResultado: z.string().optional().nullable(),
  sentencaNota: z.string().optional().nullable(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAuth(async (user) => {
    if (!ALLOWED_ROLES.includes(user.role as (typeof ALLOWED_ROLES)[number])) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }
    const { id } = await params;
    const acao = await prisma.acao.findUnique({ where: { id }, include: acaoInclude });
    if (!acao) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    return NextResponse.json({ acao });
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAuth(async (user) => {
    if (!ALLOWED_ROLES.includes(user.role as (typeof ALLOWED_ROLES)[number])) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }
    const { id } = await params;

    const existing = await prisma.acao.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

    const d = parsed.data;
    const now = new Date();

    const data: Record<string, unknown> = {};
    if (d.numCNJ !== undefined) data.numCNJ = d.numCNJ;
    if (d.valorCausa !== undefined) data.valorCausa = d.valorCausa;

    if (d.advConfirmado === true) {
      data.advConfirmadoAt = now;
      data.advConfirmadoById = user.id;
    } else if (d.advConfirmado === false) {
      data.advConfirmadoAt = null;
      data.advConfirmadoById = null;
    }
    if (d.advNota !== undefined) data.advNota = d.advNota;

    if (d.docsEnviados === true) {
      data.docsEnviadosAt = now;
      data.docsEnviadosById = user.id;
    } else if (d.docsEnviados === false) {
      data.docsEnviadosAt = null;
      data.docsEnviadosById = null;
    }
    if (d.docsNota !== undefined) data.docsNota = d.docsNota;

    if (d.entrada === true) {
      data.entradaAt = now;
      data.entradaById = user.id;
    } else if (d.entrada === false) {
      data.entradaAt = null;
      data.entradaById = null;
    }
    if (d.entradaNota !== undefined) data.entradaNota = d.entradaNota;

    if (d.sentenca === true) {
      data.sentencaAt = now;
      data.sentencaById = user.id;
    } else if (d.sentenca === false) {
      data.sentencaAt = null;
      data.sentencaById = null;
    }
    if (d.sentencaResultado !== undefined) data.sentencaResultado = d.sentencaResultado;
    if (d.sentencaNota !== undefined) data.sentencaNota = d.sentencaNota;

    const acao = await prisma.acao.update({ where: { id }, data, include: acaoInclude });
    return NextResponse.json({ acao });
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAuth(async (user) => {
    if (!ALLOWED_ROLES.includes(user.role as (typeof ALLOWED_ROLES)[number])) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }
    const { id } = await params;
    const existing = await prisma.acao.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    await prisma.acao.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  });
}
