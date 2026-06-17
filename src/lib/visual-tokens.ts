import type { ChamadoCategory, ChamadoStatus, TaskPriority } from "@prisma/client";
import type { IconName } from "@/components/ui/Icon";

export const PRIORITY_VISUAL: Record<
  TaskPriority,
  { icon: IconName; className: string; ring: string }
> = {
  BAIXA: {
    icon: "arrowDown",
    className:
      "bg-slate-100 text-slate-700 ring-slate-300/60 dark:bg-slate-500/20 dark:text-slate-200 dark:ring-slate-500/40",
    ring: "ring-slate-300/50",
  },
  MEDIA: {
    icon: "minus",
    className:
      "bg-amber-100 text-amber-900 ring-amber-300/70 dark:bg-amber-500/25 dark:text-amber-200 dark:ring-amber-500/45",
    ring: "ring-amber-400/50",
  },
  ALTA: {
    icon: "flag",
    className:
      "bg-red-100 text-red-800 ring-red-300/70 dark:bg-red-500/25 dark:text-red-200 dark:ring-red-500/45",
    ring: "ring-red-400/50",
  },
};

export const CHAMADO_STATUS_VISUAL: Record<
  ChamadoStatus,
  { icon: IconName; className: string }
> = {
  ABERTO: {
    icon: "circleDot",
    className:
      "bg-sky-100 text-sky-800 ring-sky-300/60 dark:bg-sky-500/20 dark:text-sky-200 dark:ring-sky-500/40",
  },
  EM_ANDAMENTO: {
    icon: "play",
    className:
      "bg-violet-100 text-violet-800 ring-violet-300/60 dark:bg-violet-500/20 dark:text-violet-200 dark:ring-violet-500/40",
  },
  AGUARDANDO_VALIDACAO: {
    icon: "eye",
    className:
      "bg-amber-100 text-amber-900 ring-amber-300/60 dark:bg-amber-500/20 dark:text-amber-200 dark:ring-amber-500/40",
  },
  AG_FECHAMENTO: {
    icon: "lock",
    className:
      "bg-orange-100 text-orange-900 ring-orange-300/60 dark:bg-orange-500/20 dark:text-orange-200 dark:ring-orange-500/40",
  },
  FECHADO: {
    icon: "archive",
    className:
      "bg-emerald-100 text-emerald-800 ring-emerald-300/60 dark:bg-emerald-500/20 dark:text-emerald-200 dark:ring-emerald-500/40",
  },
};

export const CHAMADO_CATEGORY_VISUAL: Record<
  ChamadoCategory,
  { icon: IconName; accent: string; className: string }
> = {
  BUG: {
    icon: "bug",
    accent: "from-red-500/25 to-red-500/5 text-red-700 dark:text-red-300",
    className:
      "bg-red-50 text-red-800 ring-red-200/80 dark:bg-red-500/15 dark:text-red-200 dark:ring-red-500/30",
  },
  SUGESTOES: {
    icon: "lightbulb",
    accent: "from-amber-500/25 to-amber-500/5 text-amber-800 dark:text-amber-300",
    className:
      "bg-amber-50 text-amber-900 ring-amber-200/80 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-500/30",
  },
  SOLICITACOES: {
    icon: "clipboardPen",
    accent: "from-sky-500/25 to-sky-500/5 text-sky-800 dark:text-sky-300",
    className:
      "bg-sky-50 text-sky-900 ring-sky-200/80 dark:bg-sky-500/15 dark:text-sky-200 dark:ring-sky-500/30",
  },
};

export const KANBAN_COLUMN_ACCENT: Record<string, string> = {
  todo: "border-t-slate-500",
  progress: "border-t-cyan-500",
  waiting: "border-t-amber-500",
  done: "border-t-emerald-500",
};
