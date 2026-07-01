import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { loginIdSchema, normalizeLoginId } from "@/lib/login-id";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { hashPassword } from "@/lib/auth";

export const runtime = "nodejs";

const patchSchema = z.object({
  name: z.string().min(2).optional(),
  email: loginIdSchema.optional(),
  password: z.string().min(6).optional(),
  role: z.enum(["ADV", "GERENTE", "COLABORADOR", "PESQUISADOR", "TI", "SUPORTE"]).optional(),
  teamId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
  workType: z.enum(["ESTAGIARIO", "CLT"]).optional(),
  gpsRequired: z.boolean().optional(),
  gpsRadiusMeters: z.number().int().min(50).max(5000).optional().nullable(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    if (!isAdmin(user)) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.user.findUnique({
      where: { id },
      include: { team: { select: { id: true, ownerId: true } } },
    });
    if (!existing || existing.role === Role.ADMIN) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    if (parsed.data.teamId) {
      const team = await prisma.team.findUnique({ where: { id: parsed.data.teamId } });
      if (!team) {
        return NextResponse.json({ error: "Equipe não encontrada" }, { status: 400 });
      }
    }

    const data: {
      name?: string;
      email?: string;
      passwordHash?: string;
      role?: Role;
      teamId?: string;
      isActive?: boolean;
      workType?: "ESTAGIARIO" | "CLT";
      gpsRequired?: boolean;
      gpsRadiusMeters?: number | null;
    } = {};

    if (parsed.data.name) data.name = parsed.data.name.trim();
    if (parsed.data.email) data.email = normalizeLoginId(parsed.data.email);
    if (parsed.data.password) data.passwordHash = await hashPassword(parsed.data.password);
    if (parsed.data.role) data.role = parsed.data.role;
    if (parsed.data.teamId) data.teamId = parsed.data.teamId;
    if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;
    if (parsed.data.workType !== undefined) data.workType = parsed.data.workType;
    if (parsed.data.gpsRequired !== undefined) data.gpsRequired = parsed.data.gpsRequired;
    if (parsed.data.gpsRadiusMeters !== undefined) data.gpsRadiusMeters = parsed.data.gpsRadiusMeters;

    try {
      const updated = await prisma.$transaction(async (tx) => {
        const userRow = await tx.user.update({
          where: { id },
          data,
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            team: { select: { id: true, name: true } },
          },
        });

        if (parsed.data.role === Role.ADV && userRow.team) {
          const team = await tx.team.findUnique({ where: { id: userRow.team!.id } });
          if (team && !team.ownerId) {
            await tx.team.update({
              where: { id: team.id },
              data: { ownerId: userRow.id },
            });
          }
        }

        return userRow;
      });

      return NextResponse.json({ user: updated });
    } catch {
      return NextResponse.json({ error: "Email já em uso ou dados inválidos" }, { status: 409 });
    }
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    if (!isAdmin(user)) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing || existing.role === Role.ADMIN) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    // Busca um admin de fallback para reassinar registros com campos não-nuláveis
    const fallbackAdmin = await prisma.user.findFirst({
      where: { role: "ADMIN", isActive: true, id: { not: id } },
      orderBy: { createdAt: "asc" },
    });
    const fallbackId = fallbackAdmin?.id ?? user.id;

    await prisma.$transaction(async (tx) => {
      // Notificações
      await tx.notification.deleteMany({ where: { userId: id } });

      // Tickets de suporte (responses + desassociar)
      await tx.supportTicketResponse.deleteMany({ where: { userId: id } });
      await tx.supportRequest.updateMany({ where: { assignedToId: id }, data: { assignedToId: null } });
      await tx.supportRequest.updateMany({ where: { requesterId: id }, data: { requesterId: null } });

      // Auditoria e sessões
      await tx.auditLog.deleteMany({ where: { userId: id } });
      await tx.userSession.deleteMany({ where: { userId: id } });
      await tx.userOnboarding.deleteMany({ where: { userId: id } });
      await tx.userAccessRule.deleteMany({ where: { userId: id } });

      // Chamados
      await tx.chamadoComment.deleteMany({ where: { authorId: id } });
      await tx.chamadoAttachment.deleteMany({ where: { uploadedById: id } });
      await tx.chamadoHistory.deleteMany({ where: { createdById: id } });
      await tx.chamado.deleteMany({ where: { requesterId: id } });
      await tx.chamado.updateMany({ where: { assigneeId: id }, data: { assigneeId: null } });

      // Ponto
      await tx.pontoRecord.deleteMany({ where: { userId: id } });

      // Chat
      await tx.chatMessage.deleteMany({ where: { senderId: id } });
      await tx.chatMessage.deleteMany({ where: { receiverId: id } });

      // Face audit
      await tx.faceAuditLog.deleteMany({ where: { actorId: id } });
      await tx.faceAuditLog.updateMany({ where: { targetUserId: id }, data: { targetUserId: null } });

      // Tasks (createdById não-nulável → reassinar)
      await tx.taskHistory.deleteMany({ where: { createdById: id } });
      await tx.task.updateMany({ where: { assigneeId: id }, data: { assigneeId: null } });
      await tx.task.updateMany({ where: { createdById: id }, data: { createdById: fallbackId } });

      // Team goals
      await tx.teamGoal.updateMany({ where: { assigneeId: id }, data: { assigneeId: null } });

      // Message templates (createdById não-nulável → reassinar)
      await tx.messageTemplate.updateMany({ where: { createdById: id }, data: { createdById: fallbackId } });

      // Clientes
      await tx.clientHistory.deleteMany({ where: { createdById: id } });
      await tx.clientChecklistProgress.updateMany({ where: { doneById: id }, data: { doneById: null } });
      await tx.clientDocument.updateMany({ where: { uploadedById: id }, data: { uploadedById: fallbackId } });
      await tx.client.updateMany({ where: { createdById: id }, data: { createdById: fallbackId } });
      await tx.client.updateMany({ where: { finalizedById: id }, data: { finalizedById: null } });
      await tx.client.updateMany({ where: { finalizationRequestedById: id }, data: { finalizationRequestedById: null } });

      // Ações (createdById não-nulável → reassinar)
      await tx.acao.updateMany({ where: { createdById: id }, data: { createdById: fallbackId } });
      await tx.acao.updateMany({ where: { advConfirmadoById: id }, data: { advConfirmadoById: null } });
      await tx.acao.updateMany({ where: { docsEnviadosById: id }, data: { docsEnviadosById: null } });
      await tx.acao.updateMany({ where: { entradaById: id }, data: { entradaById: null } });
      await tx.acao.updateMany({ where: { sentencaById: id }, data: { sentencaById: null } });

      await tx.user.delete({ where: { id } });
    });
    return NextResponse.json({ success: true });
  });
}
