import type { ChamadoStatus } from "@prisma/client";
import { CHAMADO_STATUS_LABELS } from "@/lib/enum-labels";
import { CHAMADO_STATUS_VISUAL } from "@/lib/visual-tokens";
import { Icon } from "./ui/Icon";

export function ChamadoStatusBadge({
  status,
  compact = false,
}: {
  status: ChamadoStatus;
  compact?: boolean;
}) {
  const visual = CHAMADO_STATUS_VISUAL[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${visual.className}`}
    >
      <Icon name={visual.icon} className="h-3 w-3 shrink-0" strokeWidth={2} />
      {!compact && <span className="whitespace-nowrap">{CHAMADO_STATUS_LABELS[status]}</span>}
    </span>
  );
}
