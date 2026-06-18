import type { AutomationAction, AutomationTrigger, ChamadoStatus, Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { createNotification, notifyTeam } from "./notifications";
import { getDefaultKanbanColumnId } from "./kanban-columns";
import { DEFAULT_CHAMADO_SLA_HOURS } from "./chamado-sla-config";

type AutomationContext = {
  teamId: string;
  actorId: string;
  clientId?: string;
  clientName?: string;
  chamadoId?: string;
  chamadoTitle?: string;
  documentName?: string;
};

const BUILTIN_RULES: {
  trigger: AutomationTrigger;
  action: AutomationAction;
  name: string;
  config?: Record<string, unknown>;
}[] = [
  {
    trigger: "CLIENT_STATUS_LOCALIZADO",
    action: "CREATE_TASK",
    name: "Tarefa ao localizar cliente",
    config: { titleTemplate: "Follow-up: {{clientName}}" },
  },
  {
    trigger: "CLIENT_WORKFLOW_FINALIZACAO",
    action: "NOTIFY_TEAM",
    name: "Avisar equipe sobre finalização",
    config: { title: "Finalização solicitada" },
  },
  {
    trigger: "DOCUMENT_UPLOADED",
    action: "NOTIFY_TEAM",
    name: "Avisar documento novo",
    config: { title: "Novo documento" },
  },
  {
    trigger: "CHAMADO_CREATED",
    action: "NOTIFY_TEAM",
    name: "Avisar novo chamado",
    config: { title: "Novo chamado" },
  },
];

export async function runAutomations(
  tx: Prisma.TransactionClient,
  trigger: AutomationTrigger,
  ctx: AutomationContext
) {
  const dbRules = await tx.automationRule.findMany({
    where: { teamId: ctx.teamId, trigger, enabled: true },
  });
  const rules =
    dbRules.length > 0
      ? dbRules
      : BUILTIN_RULES.filter((r) => r.trigger === trigger).map((r) => ({
          id: r.name,
          teamId: ctx.teamId,
          name: r.name,
          enabled: true,
          trigger: r.trigger,
          action: r.action,
          config: r.config ?? null,
          createdAt: new Date(),
        }));

  for (const rule of rules) {
    const config = (rule.config ?? {}) as Record<string, string>;
    if (rule.action === "CREATE_TASK" && ctx.clientId) {
      const columnId = await getDefaultKanbanColumnId(ctx.teamId);
      if (!columnId) continue;
      const title = (config.titleTemplate ?? "Follow-up: {{clientName}}").replace(
        "{{clientName}}",
        ctx.clientName ?? "Cliente"
      );
      await tx.task.create({
        data: {
          title,
          teamId: ctx.teamId,
          columnId,
          clientId: ctx.clientId,
          createdById: ctx.actorId,
          assigneeId: ctx.actorId,
        },
      });
      await createNotification(tx, {
        userId: ctx.actorId,
        type: "GENERAL",
        title: "Tarefa criada automaticamente",
        body: title,
        href: `/kanban`,
      });
    }

    if (rule.action === "NOTIFY_TEAM") {
      const title = config.title ?? "Atualização automática";
      let body = "";
      let href = "/dashboard";
      if (trigger === "CLIENT_WORKFLOW_FINALIZACAO" && ctx.clientId) {
        body = `Finalização solicitada: ${ctx.clientName ?? "cliente"}`;
        href = `/clients/${ctx.clientId}`;
      } else if (trigger === "DOCUMENT_UPLOADED" && ctx.clientId) {
        body = `Documento ${ctx.documentName ?? ""} em ${ctx.clientName ?? "cliente"}`;
        href = `/clients/${ctx.clientId}`;
      } else if (trigger === "CHAMADO_CREATED" && ctx.chamadoId) {
        body = ctx.chamadoTitle ?? "Novo chamado";
        href = `/chamados/${ctx.chamadoId}`;
      }
      await notifyTeam(tx, ctx.teamId, {
        type: "GENERAL",
        title,
        body,
        href,
      });
    }

    if (rule.action === "NOTIFY_ASSIGNEE" && ctx.chamadoId) {
      // reserved for future assignee-specific rules
    }
  }
}

export async function ensureDefaultAutomationRules(teamId: string) {
  const count = await prisma.automationRule.count({ where: { teamId } });
  if (count > 0) return;
  await prisma.automationRule.createMany({
    data: BUILTIN_RULES.map((r) => ({
      teamId,
      name: r.name,
      trigger: r.trigger,
      action: r.action,
      config: r.config as object | undefined,
    })),
  });
}

export async function ensureDefaultChamadoSla(teamId: string) {
  const count = await prisma.chamadoSlaConfig.count({ where: { teamId } });
  if (count > 0) return;
  const entries = Object.entries(DEFAULT_CHAMADO_SLA_HOURS) as [ChamadoStatus, number][];
  await prisma.chamadoSlaConfig.createMany({
    data: entries.filter(([, h]) => h > 0).map(([status, hours]) => ({ teamId, status, hours })),
  });
}
