"use client";

import { useEffect, useRef, useState } from "react";
import type { PhoneCheckResult } from "@prisma/client";
import type { ClientProfileData } from "@/lib/client-fields";
import { ClientResearchParser, type ResearchSlotValues } from "./ClientResearchTools";

export function ClientPesquisaSection({
  value,
  onChange,
  readOnly = false,
  formValues,
  clientId,
  latestPhoneChecks,
  onApplyPhone,
  onApplyAddress,
  onPhoneCheckRecorded,
  disabled,
  saving,
}: {
  value: string;
  onChange: (text: string) => void;
  readOnly?: boolean;
  formValues: ResearchSlotValues;
  clientId?: string;
  latestPhoneChecks?: Partial<Record<string, PhoneCheckResult>>;
  onApplyPhone: (phoneKey: string, value: string) => void;
  onApplyAddress: (addressKey: string, value: string) => void;
  onPhoneCheckRecorded?: () => void;
  disabled?: boolean;
  saving?: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      <section className="industrial-panel p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-xs font-semibold tracking-widest text-muted uppercase">Pesquisa</h3>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Cole textos de consultas, processos e cadastros. O conteúdo é salvo neste cliente.
            </p>
          </div>
          {!readOnly && (
            <span className="shrink-0 text-xs text-muted">
              {saving ? "Salvando..." : "Salvo automaticamente"}
            </span>
          )}
        </div>

        <textarea
          className="pesquisa-textarea"
          placeholder="Cole o resultado da pesquisa neste cliente..."
          value={value}
          readOnly={readOnly}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      </section>

      {!readOnly && (
        <section className="industrial-panel p-4 sm:p-5">
          <h4 className="mb-4 text-xs font-semibold tracking-widest text-muted uppercase">
            Extração
          </h4>
          <ClientResearchParser
            text={value}
            formValues={formValues}
            clientId={clientId}
            latestPhoneChecks={latestPhoneChecks}
            onApplyPhone={onApplyPhone}
            onApplyAddress={onApplyAddress}
            onPhoneCheckRecorded={onPhoneCheckRecorded}
            disabled={disabled}
          />
        </section>
      )}
    </div>
  );
}

export function ClientPesquisaSectionConnected({
  client,
  disabled,
  latestPhoneChecks,
  onUpdated,
  onPhoneCheckRecorded,
}: {
  client: ClientProfileData;
  disabled?: boolean;
  latestPhoneChecks?: Partial<Record<string, PhoneCheckResult>>;
  onUpdated: (client: ClientProfileData) => void;
  onPhoneCheckRecorded?: () => void;
}) {
  const [text, setText] = useState(client.pesquisa ?? "");
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setText(client.pesquisa ?? "");
  }, [client.pesquisa, client.updatedAt]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  async function patchField(field: string, value: string) {
    const res = await fetch(`/api/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value || null }),
    });
    const data = await res.json();
    if (res.ok) onUpdated(data.client);
    return res.ok;
  }

  function handleChange(next: string) {
    setText(next);
    if (disabled) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaving(true);
    saveTimer.current = setTimeout(async () => {
      await patchField("pesquisa", next);
      setSaving(false);
    }, 1200);
  }

  async function applyField(field: string, value: string) {
    await patchField(field, value);
  }

  return (
    <ClientPesquisaSection
      value={text}
      onChange={handleChange}
      readOnly={!!disabled}
      saving={saving}
      formValues={client}
      clientId={client.id}
      latestPhoneChecks={latestPhoneChecks}
      disabled={disabled}
      onApplyPhone={(key, value) => {
        void applyField(key, value);
      }}
      onApplyAddress={(key, value) => {
        void applyField(key, value);
      }}
      onPhoneCheckRecorded={() => {
        onPhoneCheckRecorded?.();
        void fetch(`/api/clients/${client.id}`)
          .then((r) => r.json())
          .then((d) => {
            if (d.client) onUpdated(d.client);
          });
      }}
    />
  );
}
