import type { TaskPriority } from "@prisma/client";
import { PRIORITY_LABELS } from "@/lib/enum-labels";
import { PRIORITY_VISUAL } from "@/lib/visual-tokens";
import { Icon } from "./ui/Icon";

export function PriorityBadge({
  priority,
  compact = false,
}: {
  priority: TaskPriority;
  compact?: boolean;
}) {
  const visual = PRIORITY_VISUAL[priority];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${visual.className}`}
    >
      <Icon name={visual.icon} className="h-3 w-3 shrink-0" strokeWidth={2.25} />
      {!compact && PRIORITY_LABELS[priority]}
    </span>
  );
}
