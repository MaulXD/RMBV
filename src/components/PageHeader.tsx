import type { IconName } from "./ui/Icon";
import { Icon } from "./ui/Icon";

export function PageHeader({
  icon,
  title,
  subtitle,
  actions,
}: {
  icon?: IconName;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-primary"
            style={{
              background: "color-mix(in srgb, var(--color-primary) 10%, var(--color-surface-elevated))",
              borderColor: "color-mix(in srgb, var(--color-primary) 25%, transparent)",
              boxShadow: "0 1px 4px color-mix(in srgb, var(--color-primary) 12%, transparent)",
            }}
          >
            <Icon name={icon} className="h-5 w-5" strokeWidth={1.65} />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle && <p className="mt-0.5 text-xs text-muted sm:text-sm">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
