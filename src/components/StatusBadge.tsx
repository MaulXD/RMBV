import type { ClientStatus } from "@prisma/client";
import { STATUS_OPTIONS } from "@/lib/client-fields";

const STATUS_STYLES: Record<ClientStatus, string> = {
  AGUARDANDO: "bg-slate-100 text-slate-700 ring-slate-300/60 dark:bg-slate-500/20 dark:text-slate-200",
  LOCALIZADO:
    "bg-emerald-100 text-emerald-800 ring-emerald-300/60 dark:bg-emerald-500/20 dark:text-emerald-200",
  SEM_SUCESSO: "bg-red-100 text-red-800 ring-red-300/60 dark:bg-red-500/20 dark:text-red-200",
  TENTE_NOVAMENTE:
    "bg-amber-100 text-amber-900 ring-amber-300/60 dark:bg-amber-500/20 dark:text-amber-200",
};

export function StatusBadge({ status }: { status: ClientStatus }) {
  const label = STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
  return (
    <span
      className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${STATUS_STYLES[status]}`}
    >
      {label}
    </span>
  );
}
