"use client";

import type { ChamadoListItem } from "@/lib/chamado-fields";
import { CategoryBadge } from "./CategoryBadge";
import { PriorityBadge } from "./PriorityBadge";
import { ChamadoStatusBadge } from "./ChamadoStatusBadge";
import { Icon } from "./ui/Icon";

export function ChamadoListCard({
  chamado,
  onClick,
}: {
  chamado: ChamadoListItem;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="soft-card soft-card-hover w-full p-3 text-left"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[10px] font-bold text-primary">#{chamado.number}</span>
            <CategoryBadge category={chamado.category} />
          </div>
          <p className="line-clamp-2 text-sm font-semibold text-foreground">{chamado.title}</p>
          <p className="mt-1 text-[11px] text-muted">{chamado.requester.name}</p>
        </div>
        <Icon name="chevronRight" className="mt-1 h-4 w-4 shrink-0 text-muted/50" />
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-2">
        <ChamadoStatusBadge status={chamado.status} />
        <PriorityBadge priority={chamado.priority} compact />
        {chamado.assignee && (
          <span className="ml-auto truncate text-[10px] text-muted">{chamado.assignee.name}</span>
        )}
      </div>
    </button>
  );
}
