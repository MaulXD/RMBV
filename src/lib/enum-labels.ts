import type { ChamadoCategory, ChamadoStatus, TaskPriority } from "@prisma/client";

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  BAIXA: "Baixa",
  MEDIA: "Média",
  ALTA: "Alta",
};

export const CHAMADO_STATUS_LABELS: Record<ChamadoStatus, string> = {
  ABERTO: "Aberto",
  EM_ANDAMENTO: "Em andamento",
  AGUARDANDO_VALIDACAO: "Aguardando validação",
  AG_FECHAMENTO: "Ag. fechamento",
  FECHADO: "Fechado",
};

export const CHAMADO_STATUS_ORDER: ChamadoStatus[] = [
  "ABERTO",
  "EM_ANDAMENTO",
  "AGUARDANDO_VALIDACAO",
  "AG_FECHAMENTO",
  "FECHADO",
];

export const CHAMADO_CATEGORY_LABELS: Record<ChamadoCategory, string> = {
  BUG: "Bug",
  SUGESTOES: "Sugestão",
  SOLICITACOES: "Solicitação",
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  BAIXA: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  MEDIA: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  ALTA: "bg-red-500/15 text-red-700 dark:text-red-300",
};
