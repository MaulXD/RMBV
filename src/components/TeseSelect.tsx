"use client";

import { useTeseFilter } from "./TeseFilterProvider";

export function TeseSelect({
  value,
  onChange,
  required = false,
}: {
  value: string;
  onChange: (teseId: string) => void;
  required?: boolean;
}) {
  const { teses, loading } = useTeseFilter();

  return (
    <div>
      <label className="mb-1 block text-xs text-muted">
        TESE {required ? "*" : ""}
      </label>
      <select
        className="industrial-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={loading}
      >
        <option value="">— Selecione —</option>
        {teses.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </div>
  );
}
