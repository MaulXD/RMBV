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
        className={`btn-icon ${active ? activeClassName ?? "btn-icon-active-valid" : ""}`}
      >
        {children}
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute top-full left-1/2 z-30 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-surface-elevated px-2 py-1 text-[11px] font-medium text-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {label}
      </span>
    </div>
  );
}
