import { Icon } from "./Icon";

export function SelectField({
  label,
  value,
  onChange,
  children,
  required,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-muted">{label}</label>
      <div className="relative">
        <select
          className="industrial-input appearance-none pr-10"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        >
          {children}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted">
          <Icon name="chevronDown" className="h-4 w-4" />
        </span>
      </div>
    </div>
  );
}
