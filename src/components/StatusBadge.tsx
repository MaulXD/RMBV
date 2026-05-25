import type { ClientStatus } from "@prisma/client";
import { STATUS_OPTIONS } from "@/lib/client-fields";

const STATUS_STYLES: Record<ClientStatus, string> = {
  AGUARDANDO: "border-titanio-400 text-titanio-600 dark:text-titanio-300",
  LOCALIZADO: "border-green-600 text-green-700 dark:text-green-400",
  SEM_SUCESSO: "border-red-500 text-red-700 dark:text-red-400",
  TENTE_NOVAMENTE: "border-amber-500 text-amber-700 dark:text-amber-400",
};

export function StatusBadge({ status }: { status: ClientStatus }) {
  const label = STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
  return (
    <span
      className={`rounded-[var(--radius-ui)] border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {label}
    </span>
  );
}
