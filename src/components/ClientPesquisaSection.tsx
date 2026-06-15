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
    <section className="industrial-panel space-y-4 p-4">
      <div>
        <h3 className="text-xs font-semibold tracking-widest text-muted uppercase">Pesquisa</h3>
        <p className="mt-1 text-sm text-muted">
          Cole aqui os textos de consultas, processos e cadastros para extrair telefones e endereços.
        </p>
      </div>

      <textarea
        className="industrial-input min-h-[220px] w-full resize-y font-mono text-sm"
        placeholder="Cole o resultado da pesquisa neste cliente..."
        value={value}
        readOnly={readOnly}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />

      {saving && (
        <p className="text-xs text-muted">Salvando pesquisa...</p>
      )}

      {!readOnly && (
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
      )}
    </section>
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
