import type { ChamadoCategory } from "@prisma/client";
import { CHAMADO_CATEGORY_LABELS } from "@/lib/enum-labels";
import { CHAMADO_CATEGORY_VISUAL } from "@/lib/visual-tokens";
import { Icon } from "./ui/Icon";

export function CategoryBadge({
  category,
  showIcon = true,
}: {
  category: ChamadoCategory;
  showIcon?: boolean;
}) {
  const visual = CHAMADO_CATEGORY_VISUAL[category];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${visual.className}`}
    >
      {showIcon && <Icon name={visual.icon} className="h-3 w-3 shrink-0" strokeWidth={2} />}
      {CHAMADO_CATEGORY_LABELS[category]}
    </span>
  );
}
