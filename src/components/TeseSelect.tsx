"use client";

import { useTeseFilter } from "./TeseFilterProvider";
import { SelectField } from "./ui/SelectField";

export function TeseSelect({
  value,
  onChange,
  required = false,
  teamIdFilter,
}: {
  value: string;
  onChange: (teseId: string) => void;
  required?: boolean;
  teamIdFilter?: string;
}) {
  const { teses, loading } = useTeseFilter();
  const options = teamIdFilter
    ? teses.filter((t) => t.teamId === teamIdFilter)
    : teses.filter((t) => t.teamId);

  return (
    <SelectField
      label={`TESE${required ? " *" : ""}`}
      value={value}
      onChange={onChange}
      required={required}
    >
      <option value="">{loading ? "Carregando..." : "— Selecione —"}</option>
      {options.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </SelectField>
  );
}
