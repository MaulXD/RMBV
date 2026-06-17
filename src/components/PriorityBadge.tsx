import type { TaskPriority } from "@prisma/client";
import { PRIORITY_COLORS, PRIORITY_LABELS } from "@/lib/enum-labels";

export function PriorityBadge({
  priority,
  compact = false,
}: {
  priority: TaskPriority;
  compact?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${PRIORITY_COLORS[priority]}`}
    >
      {compact ? priority.charAt(0) : PRIORITY_LABELS[priority]}
    </span>
  );
}
