"use client";

import type { ChamadoStatus } from "@prisma/client";
import { CHAMADO_STATUS_LABELS, CHAMADO_STATUS_ORDER } from "@/lib/enum-labels";
import { CHAMADO_STATUS_VISUAL } from "@/lib/visual-tokens";
import { Icon } from "./ui/Icon";

export function ChamadoStatusPipeline({
  status,
  onChange,
  disabled,
}: {
  status: ChamadoStatus;
  onChange?: (status: ChamadoStatus) => void;
  disabled?: boolean;
}) {
  const currentIdx = CHAMADO_STATUS_ORDER.indexOf(status);

  return (
    <ol className="flex flex-wrap items-center gap-1.5">
      {CHAMADO_STATUS_ORDER.map((step, idx) => {
        const done = idx < currentIdx;
        const active = idx === currentIdx;
        const clickable = onChange && !disabled;
        const visual = CHAMADO_STATUS_VISUAL[step];

        return (
          <li key={step} className="flex items-center gap-1">
            {idx > 0 && (
              <span
                className={`hidden h-0.5 w-3 sm:block ${done ? "bg-primary/60" : "bg-border"}`}
              />
            )}
            <button
              type="button"
              disabled={!clickable}
              onClick={() => onChange?.(step)}
              title={CHAMADO_STATUS_LABELS[step]}
              className={`flex items-center gap-1 rounded-xl border px-2 py-1 text-[10px] font-semibold ring-1 ring-inset transition-all duration-150 sm:px-2.5 sm:py-1.5 sm:text-xs ${
                active
                  ? `${visual.className} scale-[1.02] shadow-sm`
                  : done
                    ? `${visual.className} opacity-80`
                    : "border-border/80 bg-surface text-muted ring-transparent"
              } ${clickable ? "hover:scale-[1.02] hover:shadow-sm" : "cursor-default"}`}
            >
              {done ? (
                <Icon name="check" className="h-3 w-3" />
              ) : (
                <Icon name={visual.icon} className="h-3 w-3" />
              )}
              <span className="hidden sm:inline">{CHAMADO_STATUS_LABELS[step]}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
