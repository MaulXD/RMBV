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
  _count: { select: { movimentacoes: true } },
} as const;

const patchSchema = z.object({
  numCNJ: z.string().optional().nullable(),
  numProcesso: z.string().optional().nullable(),
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
  // Processual fields
  classe: z.string().optional().nullable(),
  assunto: z.string().optional().nullable(),
  vara: z.string().optional().nullable(),
  foro: z.string().optional().nullable(),
  tribunal: z.string().optional().nullable(),
  sistema: z.string().optional().nullable(),
  parteContraria: z.string().optional().nullable(),
  valorAtualizado: z.number().optional().nullable(),
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
    if (d.numProcesso !== undefined) data.numProcesso = d.numProcesso;
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

    // Processual fields
    if (d.classe !== undefined) data.classe = d.classe;
    if (d.assunto !== undefined) data.assunto = d.assunto;
    if (d.vara !== undefined) data.vara = d.vara;
    if (d.foro !== undefined) data.foro = d.foro;
    if (d.tribunal !== undefined) data.tribunal = d.tribunal;
    if (d.sistema !== undefined) data.sistema = d.sistema;
    if (d.parteContraria !== undefined) data.parteContraria = d.parteContraria;
    if (d.valorAtualizado !== undefined) data.valorAtualizado = d.valorAtualizado;

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
