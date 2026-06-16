import type { ClientWorkflowStatus } from "@prisma/client";
import { WORKFLOW_OPTIONS } from "@/lib/client-fields";

const STYLES: Record<ClientWorkflowStatus, string> = {
  EM_ANDAMENTO: "bg-cyan-500/10 text-cyan-800 border-cyan-500/25 dark:text-cyan-400",
  FINALIZACAO_SOLICITADA: "bg-amber-500/10 text-amber-800 border-amber-500/25 dark:text-amber-400",
  FINALIZADO: "bg-emerald-500/10 text-emerald-800 border-emerald-500/30 dark:text-emerald-400",
};

export function WorkflowBadge({ status }: { status: ClientWorkflowStatus }) {
  const label = WORKFLOW_OPTIONS.find((s) => s.value === status)?.label ?? status;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${STYLES[status]}`}
    >
      {label}
    </span>
  );
}
