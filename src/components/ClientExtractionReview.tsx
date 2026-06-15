"use client";

import { useEffect, useState } from "react";
import type { PhoneCheckResult } from "@prisma/client";
import type { ClientProfileData } from "@/lib/client-fields";
import { PHONE_FIELD_KEYS } from "@/lib/client-fields";
import { PhoneCheckButtons } from "./PhoneCheckButtons";
import { CopyButton } from "./CopyButton";

const REVIEW_SCALAR_FIELDS = [
  { key: "cod", label: "COD" },
  { key: "name", label: "NOME" },
  { key: "cpf", label: "CPF" },
  { key: "birthDate", label: "DATA DE NASCIMENTO" },
  { key: "obito", label: "ÓBITO" },
  { key: "deathDate", label: "DATA ÓBITO" },
] as const;

const REVIEW_ADDRESS_FIELDS = [
  { key: "address1", label: "ENDEREÇO 1" },
  { key: "address2", label: "ENDEREÇO 2" },
  { key: "address3", label: "ENDEREÇO 3" },
] as const;

export function ClientExtractionReview({
  client,
  disabled,
  latestPhoneChecks,
  highlightedFields,
  overwrittenFields,
  onUpdated,
  onPhoneCheckRecorded,
}: {
  client: ClientProfileData;
  disabled?: boolean;
  latestPhoneChecks?: Partial<Record<string, PhoneCheckResult>>;
  highlightedFields?: Set<string>;
  overwrittenFields?: Set<string>;
  onUpdated: (client: ClientProfileData) => void;
  onPhoneCheckRecorded?: () => void;
}) {
  const [draft, setDraft] = useState(client);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(client);
  }, [client]);

  function setField(key: string, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const keys = [
        ...REVIEW_SCALAR_FIELDS.map((f) => f.key),
        ...REVIEW_ADDRESS_FIELDS.map((f) => f.key),
        ...PHONE_FIELD_KEYS,
      ];
      const payload: Record<string, string | null> = {};
      for (const key of keys) {
        payload[key] = String(draft[key as keyof ClientProfileData] ?? "").trim() || null;
      }

      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao salvar revisão");
      onUpdated(data.client);
      setMessage("Revisão salva com sucesso.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  const phones = PHONE_FIELD_KEYS.map((key, index) => ({
    key,
    label: `TELEFONE ${index + 1}`,
    value: String(draft[key] ?? "").trim(),
  })).filter((p) => p.value);

  return (
    <div className="flex flex-col gap-6">
      <section className="industrial-panel space-y-4 p-4 sm:p-5">
        <div>
          <h3 className="text-xs font-semibold tracking-widest text-muted uppercase">Revisão</h3>
          <p className="mt-1 text-sm text-muted">
            Confirme ou ajuste os dados extraídos — campos substituídos precisam ser revisados antes de
            confirmar.
          </p>
        </div>

        <fieldset className="space-y-3">
          <legend className="text-xs font-semibold tracking-widest text-muted uppercase">
            Identificação
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {REVIEW_SCALAR_FIELDS.map(({ key, label }) => (
              <div key={key} className={key === "name" ? "sm:col-span-2" : ""}>
                <label className="mb-1 flex items-center gap-2 text-xs text-muted">
                  {label}
                  {highlightedFields?.has(key) && (
                    <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary">
                      {overwrittenFields?.has(key) ? "substituído" : "extraído"}
                    </span>
                  )}
                </label>
                <input
                  className="industrial-input"
                  disabled={disabled}
                  value={String(draft[key] ?? "")}
                  onChange={(e) => setField(key, e.target.value)}
                />
              </div>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-xs font-semibold tracking-widest text-muted uppercase">
            Endereços
          </legend>
          <div className="grid gap-3">
            {REVIEW_ADDRESS_FIELDS.map(({ key, label }) => (
              <div key={key}>
                <label className="mb-1 flex items-center gap-2 text-xs text-muted">
                  {label}
                  {highlightedFields?.has(key) && (
                    <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary">
                      {overwrittenFields?.has(key) ? "substituído" : "extraído"}
                    </span>
                  )}
                </label>
                <input
                  className="industrial-input"
                  disabled={disabled}
                  value={String(draft[key] ?? "")}
                  onChange={(e) => setField(key, e.target.value)}
                />
              </div>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-xs font-semibold tracking-widest text-muted uppercase">
            Telefones
          </legend>
          {phones.length === 0 ? (
            <p className="text-sm text-muted">Nenhum telefone para revisar.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {phones.map((phone) => (
                <div key={phone.key} className="field-card">
                  <label className="mb-1 flex items-center gap-2 text-xs text-muted">
                    {phone.label}
                    {highlightedFields?.has(phone.key) && (
                      <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary">
                        {overwrittenFields?.has(phone.key) ? "substituído" : "extraído"}
                      </span>
                    )}
                  </label>
                  <input
                    className="industrial-input"
                    disabled={disabled}
                    value={phone.value}
                    onChange={(e) => setField(phone.key, e.target.value)}
                  />
                  <div className="action-toolbar">
                    <CopyButton value={phone.value} label={`Copiar ${phone.label}`} compact />
                    <PhoneCheckButtons
                      clientId={client.id}
                      phoneKey={phone.key}
                      phoneValue={phone.value}
                      currentResult={latestPhoneChecks?.[phone.key]}
                      disabled={disabled}
                      onRecorded={onPhoneCheckRecorded}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </fieldset>

        {!disabled && (
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border/60 pt-4">
            {error && <p className="alert alert-error mr-auto flex-1">{error}</p>}
            {message && !error && <p className="alert alert-success mr-auto flex-1">{message}</p>}
            <button type="button" className="btn-primary shrink-0" disabled={saving} onClick={handleSave}>
              {saving ? "Salvando..." : "Confirmar revisão"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
