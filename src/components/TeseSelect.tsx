"use client";

import { useTeseFilter } from "./TeseFilterProvider";
import { SelectField } from "./ui/SelectField";

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
    <SelectField
      label={`TESE${required ? " *" : ""}`}
      value={value}
      onChange={onChange}
      required={required}
    >
      <option value="">{loading ? "Carregando..." : "— Selecione —"}</option>
      {teses.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </SelectField>
  );
}
