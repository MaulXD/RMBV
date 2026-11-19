import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api";
import { isAdminUser, teamScopeWhere } from "@/lib/team-access";
import { ROLES_ADVOGADO, podeEditarAtualizacoes } from "@/lib/materias-access";

export const runtime = "nodejs";

const schema = z.object({
  clientId: z.string().uuid(),
  teseId: z.string().uuid().nullable().optional(),
  advogadoId: z.string().uuid().nullable().optional(),
});

// Coloca o cliente numa ação (tese) e define o advogado responsável.
// Campo ausente = não mexe; null = remove o vínculo.
export async function PATCH(request: NextRequest) {
  return withAuth(async (user) => {
    if (!podeEditarAtualizacoes(user)) {
      return NextResponse.json({ error: "Seu perfil não pode mudar a ação nem o advogado do cliente." }, { status: 403 });
    }
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }
    const { clientId, teseId, advogadoId } = parsed.data;

    const cliente = await prisma.client.findFirst({
      where: { id: clientId, ...teamScopeWhere(user) },
      select: {
        id: true,
        teamId: true,
        teseId: true,
        advogadoId: true,
        teseRef: { select: { name: true } },
        advogado: { select: { name: true } },
      },
    });
    if (!cliente) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });

    const data: { teseId?: string | null; tese?: string | null; advogadoId?: string | null } = {};
    const notas: string[] = [];

    if (teseId !== undefined && teseId !== cliente.teseId) {
      if (teseId) {
        const tese = await prisma.tese.findUnique({ where: { id: teseId }, select: { name: true, teamId: true } });
        const mesmaEquipe = tese && (tese.teamId === cliente.teamId || (isAdminUser(user) && !tese.teamId));
        if (!tese || !mesmaEquipe) {
          return NextResponse.json({ error: "Essa ação não é da equipe do cliente." }, { status: 400 });
        }
        data.teseId = teseId;
        data.tese = tese.name;
        notas.push(`Ação: ${cliente.teseRef?.name ?? "nenhuma"} para ${tese.name}`);
      } else {
        data.teseId = null;
        data.tese = null;
        notas.push(`Ação removida (era ${cliente.teseRef?.name ?? "nenhuma"})`);
      }
    }

    if (advogadoId !== undefined && advogadoId !== cliente.advogadoId) {
      if (advogadoId) {
        const adv = await prisma.user.findUnique({
          where: { id: advogadoId },
          select: { name: true, role: true, teamId: true, isActive: true },
        });
        const valido =
          adv &&
          adv.isActive &&
          ROLES_ADVOGADO.includes(adv.role) &&
          (isAdminUser(user) || adv.teamId === cliente.teamId);
        if (!adv || !valido) {
          return NextResponse.json({ error: "Advogado inválido para este cliente." }, { status: 400 });
        }
        data.advogadoId = advogadoId;
        notas.push(`Advogado responsável: ${adv.name}`);
      } else {
        data.advogadoId = null;
        notas.push(`Advogado responsável removido (era ${cliente.advogado?.name ?? "nenhum"})`);
      }
    }

    if (!notas.length) return NextResponse.json({ ok: true, alterado: false });

    const [atualizado] = await prisma.$transaction([
      prisma.client.update({
        where: { id: clientId },
        data,
        select: {
          id: true,
          teseId: true,
          teseRef: { select: { name: true } },
          advogado: { select: { id: true, name: true } },
        },
      }),
      prisma.clientHistory.create({
        data: {
          clientId,
          type: "NOTE",
          createdById: user.id,
          note: `${notas.join(". ")}. (tela Dúvidas)`,
        },
      }),
    ]);

    return NextResponse.json({ ok: true, alterado: true, cliente: atualizado });
  });
}
