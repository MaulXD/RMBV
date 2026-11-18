import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api";
import { podeEditarAtualizacoes, teseNoEscopo } from "@/lib/materias-access";

export const runtime = "nodejs";

const schema = z.object({
  teseId: z.string().uuid(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  titulo: z.string().trim().min(3).max(160),
  texto: z.string().trim().min(3).max(4000),
  fonteUrl: z.string().trim().url().max(500).optional().nullable().or(z.literal("")),
});

// Registra uma atualização (decisão, julgamento, pagamento) de uma ação coletiva.
export async function POST(request: NextRequest) {
  return withAuth(async (user) => {
    if (!podeEditarAtualizacoes(user)) {
      return NextResponse.json({ error: "Seu perfil não pode registrar atualizações." }, { status: 403 });
    }
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Preencha data, título e texto." }, { status: 400 });
    }
    const { teseId, data, titulo, texto, fonteUrl } = parsed.data;
    const tese = await prisma.tese.findUnique({ where: { id: teseId }, select: { teamId: true } });
    if (!tese || !teseNoEscopo(user, tese.teamId)) {
      return NextResponse.json({ error: "Ação não encontrada." }, { status: 404 });
    }
    const atualizacao = await prisma.teseAtualizacao.create({
      data: {
        teseId,
        data: new Date(`${data}T12:00:00Z`),
        titulo,
        texto,
        fonteUrl: fonteUrl || null,
        createdById: user.id,
      },
    });
    return NextResponse.json({ atualizacao }, { status: 201 });
  });
}

export async function DELETE(request: NextRequest) {
  return withAuth(async (user) => {
    if (!podeEditarAtualizacoes(user)) {
      return NextResponse.json({ error: "Seu perfil não pode apagar atualizações." }, { status: 403 });
    }
    const id = new URL(request.url).searchParams.get("id") ?? "";
    const atual = await prisma.teseAtualizacao.findUnique({
      where: { id },
      select: { id: true, tese: { select: { teamId: true } } },
    });
    if (!atual || !teseNoEscopo(user, atual.tese.teamId)) {
      return NextResponse.json({ error: "Atualização não encontrada." }, { status: 404 });
    }
    await prisma.teseAtualizacao.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  });
}
