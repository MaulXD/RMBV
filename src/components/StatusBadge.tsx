import type { ClientStatus } from "@prisma/client";
import { STATUS_OPTIONS } from "@/lib/client-fields";

const STATUS_STYLES: Record<ClientStatus, string> = {
  AGUARDANDO: "border-border text-muted",
  LOCALIZADO: "border-success/50 text-success",
  SEM_SUCESSO: "border-danger/50 text-danger",
  TENTE_NOVAMENTE: "border-primary/50 text-foreground",
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
