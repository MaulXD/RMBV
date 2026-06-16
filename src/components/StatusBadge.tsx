import type { ClientStatus } from "@prisma/client";
import { STATUS_OPTIONS } from "@/lib/client-fields";

const STATUS_STYLES: Record<ClientStatus, string> = {
  AGUARDANDO: "bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-400",
  LOCALIZADO: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-400",
  SEM_SUCESSO: "bg-red-500/10 text-red-700 border-red-500/25 dark:text-red-400",
  TENTE_NOVAMENTE: "bg-amber-500/10 text-amber-800 border-amber-500/25 dark:text-amber-400",
};

export function StatusBadge({ status }: { status: ClientStatus }) {
  const label = STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[status]}`}
    >
      {label}
    </span>
  );
}
