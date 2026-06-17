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
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/22 to-primary/6 text-primary shadow-sm">
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
