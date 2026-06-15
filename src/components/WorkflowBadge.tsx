import type { ClientWorkflowStatus } from "@prisma/client";
import { WORKFLOW_OPTIONS } from "@/lib/client-fields";

const STYLES: Record<ClientWorkflowStatus, string> = {
  EM_ANDAMENTO: "border-titanio-400 text-titanio-600 dark:text-titanio-300",
  FINALIZACAO_SOLICITADA: "border-amber-500 text-amber-700 dark:text-amber-400",
  FINALIZADO: "border-green-600 text-green-700 dark:text-green-400",
};

export function WorkflowBadge({ status }: { status: ClientWorkflowStatus }) {
  const label = WORKFLOW_OPTIONS.find((s) => s.value === status)?.label ?? status;
  return (
    <span
      className={`rounded-[var(--radius-ui)] border px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      {label}
    </span>
  );
}
