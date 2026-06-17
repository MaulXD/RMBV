"use client";

import { Icon, type IconName } from "./ui/Icon";

export function ToolPickerCard({
  icon,
  title,
  description,
  active,
  onClick,
  accent = "primary",
}: {
  icon: IconName;
  title: string;
  description: string;
  active?: boolean;
  onClick: () => void;
  accent?: "primary" | "amber" | "emerald" | "sky" | "violet";
}) {
  const accentMap = {
    primary: "from-primary/20 to-primary/5 text-primary",
    amber: "from-amber-500/20 to-amber-500/5 text-amber-700 dark:text-amber-300",
    emerald: "from-emerald-500/20 to-emerald-500/5 text-emerald-700 dark:text-emerald-300",
    sky: "from-sky-500/20 to-sky-500/5 text-sky-700 dark:text-sky-300",
    violet: "from-violet-500/20 to-violet-500/5 text-violet-700 dark:text-violet-300",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`group flex flex-col items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        active
          ? "border-primary/45 bg-primary/8 shadow-sm ring-2 ring-primary/20"
          : "border-border/80 bg-surface-elevated hover:border-primary/25"
      }`}
    >
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${accentMap[accent]} transition-transform group-hover:scale-105`}
      >
        <Icon name={icon} className="h-6 w-6" strokeWidth={1.65} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">{description}</p>
      </div>
    </button>
  );
}

export function ToolPickerStrip({
  items,
  activeId,
  onSelect,
}: {
  items: { id: string; label: string; icon: IconName }[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            title={item.label}
            onClick={() => onSelect(item.id)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
              active
                ? "border-primary/40 bg-primary/12 text-primary"
                : "border-border bg-surface-elevated text-muted hover:border-primary/25 hover:text-foreground"
            }`}
          >
            <Icon name={item.icon} className="h-4 w-4" />
            <span className="whitespace-nowrap">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
