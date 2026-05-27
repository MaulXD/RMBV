"use client";

import { useState } from "react";
import {
  CLIENT_FIELD_GROUPS,
  PHONE_FIELD_KEYS,
  countVisiblePhones,
  type ClientFormFieldValues,
  type ClientFormValues,
} from "@/lib/client-fields";
import { CopyButton } from "./CopyButton";
import { PhoneCheckButtons } from "./PhoneCheckButtons";
import type { PhoneCheckResult } from "@prisma/client";

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
  clientId,
  latestPhoneChecks,
  onPhoneCheckRecorded,
  phoneActionsDisabled,
}: {
  values: ClientFormFieldValues | ClientFormValues;
  onChange: (key: ClientFormFieldKey, value: string) => void;
  readOnly?: boolean;
  requiredName?: boolean;
  clientId?: string;
  latestPhoneChecks?: Partial<Record<string, PhoneCheckResult>>;
  onPhoneCheckRecorded?: () => void;
  phoneActionsDisabled?: boolean;
}) {
  const [phoneSlots, setPhoneSlots] = useState(() => countVisiblePhones(values));

  const nonPhoneGroups = CLIENT_FIELD_GROUPS.filter((g) => g.title !== "Telefones");

  function addPhoneSlot() {
    setPhoneSlots((n) => Math.min(10, n + 1));
  }

  return (
    <>
      {nonPhoneGroups.map((group) => (
        <fieldset key={group.title} className="space-y-3">
          <legend className="text-xs font-semibold tracking-widest text-muted uppercase">
            {group.title}
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {group.fields.map((field) => {
              const value = String(values[field.key as ClientFormFieldKey] ?? "");
              const colSpan =
                field.key === "name" || field.key === "address1" ? "sm:col-span-2" : "";

              return (
                <div key={field.key} className={colSpan}>
                  <label className="mb-1 block text-xs text-muted">
                    {field.label}
                    {requiredName && field.key === "name" ? " *" : ""}
                  </label>
                  <input
                    className="industrial-input"
                    disabled={readOnly}
                    value={value}
                    onChange={(e) => onChange(field.key as ClientFormFieldKey, e.target.value)}
                    required={requiredName && field.key === "name"}
                  />
                </div>
              );
            })}
          </div>
        </fieldset>
      ))}

      <fieldset className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <legend className="text-xs font-semibold tracking-widest text-muted uppercase">
            Telefones
          </legend>
          {!readOnly && phoneSlots < 10 && (
            <button type="button" className="btn-ghost text-xs" onClick={addPhoneSlot}>
              + Adicionar telefone
            </button>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {PHONE_FIELD_KEYS.slice(0, phoneSlots).map((key, index) => {
            const value = String(values[key] ?? "");
            const label = `TELEFONE ${index + 1}`;

            return (
              <div key={key} className="rounded-[var(--radius-ui)] border border-border/60 bg-surface/50 p-3">
                <label className="mb-1.5 block text-xs text-muted">{label}</label>
                <input
                  className="industrial-input"
                  disabled={readOnly}
                  value={value}
                  onChange={(e) => onChange(key as ClientFormFieldKey, e.target.value)}
                  placeholder="(00) 00000-0000"
                />
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <CopyButton value={value} label={`Copiar ${label}`} compact />
                  {clientId && (
                    <PhoneCheckButtons
                      clientId={clientId}
                      phoneKey={key}
                      phoneValue={value}
                      currentResult={latestPhoneChecks?.[key]}
                      disabled={phoneActionsDisabled || readOnly}
                      onRecorded={onPhoneCheckRecorded}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </fieldset>
    </>
  );
}
