"use client";

export function IconTooltipButton({
  label,
  onClick,
  disabled,
  active,
  activeClassName,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  activeClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-ui)] border border-border transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
          active
            ? activeClassName ?? "border-accent bg-accent/15 text-accent"
            : "bg-surface hover:bg-muted/20"
        }`}
      >
        {children}
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-2 py-1 text-[11px] font-medium text-background opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {label}
      </span>
    </div>
  );
}
