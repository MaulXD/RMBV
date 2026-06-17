"use client";

import type { ChamadoStatus } from "@prisma/client";
import { CHAMADO_STATUS_LABELS, CHAMADO_STATUS_ORDER } from "@/lib/enum-labels";
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
    <ol className="flex flex-wrap items-center gap-1 sm:gap-2">
      {CHAMADO_STATUS_ORDER.map((step, idx) => {
        const done = idx < currentIdx;
        const active = idx === currentIdx;
        const clickable = onChange && !disabled;

        return (
          <li key={step} className="flex items-center gap-1 sm:gap-2">
            {idx > 0 && (
              <span className={`hidden h-px w-4 sm:block ${done ? "bg-primary" : "bg-border"}`} />
            )}
            <button
              type="button"
              disabled={!clickable}
              onClick={() => onChange?.(step)}
              className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs transition-colors sm:px-3 sm:py-1.5 ${
                active
                  ? "border-primary bg-primary/10 font-semibold text-primary"
                  : done
                    ? "border-primary/30 bg-primary/5 text-primary"
                    : "border-border text-muted"
              } ${clickable ? "hover:border-primary/50" : "cursor-default"}`}
            >
              {done ? (
                <Icon name="check" className="h-3 w-3" />
              ) : (
                <span className="flex h-4 w-4 items-center justify-center rounded-full border border-current text-[9px]">
                  {idx + 1}
                </span>
              )}
              <span className="hidden sm:inline">{CHAMADO_STATUS_LABELS[step]}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
