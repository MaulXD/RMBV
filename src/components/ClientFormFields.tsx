"use client";

import {
  CLIENT_FIELD_GROUPS,
  type ClientFormFieldValues,
  type ClientFormValues,
} from "@/lib/client-fields";
import { CopyButton } from "./CopyButton";

function isPhoneKey(key: string) {
  return /^phone\d+$/.test(key);
}

const FORM_FIELD_KEYS = [
  "cod",
  "name",
  "cpf",
  "birthDate",
  "obito",
  "deathDate",
  "phone1",
  "phone2",
  "phone3",
  "phone4",
  "phone5",
  "phone6",
  "phone7",
  "phone8",
  "phone9",
  "phone10",
  "address1",
  "address2",
  "address3",
] as const;

export type ClientFormFieldKey = (typeof FORM_FIELD_KEYS)[number];

export function ClientFormFields({
  values,
  onChange,
  readOnly = false,
  requiredName = false,
}: {
  values: ClientFormFieldValues | ClientFormValues;
  onChange: (key: ClientFormFieldKey, value: string) => void;
  readOnly?: boolean;
  requiredName?: boolean;
}) {
  return (
    <>
      {CLIENT_FIELD_GROUPS.map((group) => (
        <fieldset key={group.title} className="space-y-3">
          <legend className="text-xs font-semibold tracking-widest text-muted uppercase">
            {group.title}
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {group.fields.map((field) => {
              const value = String(values[field.key as ClientFormFieldKey] ?? "");
              const isPhone = isPhoneKey(field.key);
              const colSpan =
                field.key === "name" || field.key === "address1" ? "sm:col-span-2" : "";

              return (
                <div key={field.key} className={colSpan}>
                  <label className="mb-1 block text-xs text-muted">
                    {field.label}
                    {requiredName && field.key === "name" ? " *" : ""}
                  </label>
                  {isPhone ? (
                    <div className="flex gap-1">
                      <input
                        className="industrial-input min-w-0 flex-1"
                        disabled={readOnly}
                        value={value}
                        onChange={(e) => onChange(field.key as ClientFormFieldKey, e.target.value)}
                      />
                      <CopyButton value={value} label={`Copiar ${field.label}`} />
                    </div>
                  ) : (
                    <input
                      className="industrial-input"
                      disabled={readOnly}
                      value={value}
                      onChange={(e) => onChange(field.key as ClientFormFieldKey, e.target.value)}
                      required={requiredName && field.key === "name"}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </fieldset>
      ))}
    </>
  );
}
