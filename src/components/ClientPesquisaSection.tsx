"use client";

import { useEffect, useRef, useState } from "react";
import type { PhoneCheckResult } from "@prisma/client";
import type { ClientProfileData } from "@/lib/client-fields";
import { ClientResearchParser } from "./ClientResearchTools";
import { buildExtractionApplyPlan, toClientSnapshot, type ClientSnapshot } from "@/lib/extraction-proposal";
import { Icon } from "./ui/Icon";

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
  onExtractAndApply,
  disabled,
  saving,
  extracting,
}: {
  value: string;
  onChange: (text: string) => void;
  readOnly?: boolean;
  formValues: ClientSnapshot;
  clientId?: string;
  latestPhoneChecks?: Partial<Record<string, PhoneCheckResult>>;
  onApplyPhone: (phoneKey: string, value: string) => void;
  onApplyAddress: (addressKey: string, value: string) => void;
  onPhoneCheckRecorded?: () => void;
  onExtractAndApply?: () => Promise<{ filledCount: number; message?: string } | null>;
  disabled?: boolean;
  saving?: boolean;
  extracting?: boolean;
}) {
  const [extractMsg, setExtractMsg] = useState<string | null>(null);

  async function handleExtractAll() {
    if (!onExtractAndApply) return;
    setExtractMsg(null);
    const result = await onExtractAndApply();
    if (result) {
      setExtractMsg(
        result.message ??
          (result.filledCount > 0
            ? `${result.filledCount} campo(s) atualizado(s) e salvo(s). Revise na aba Revisão e confirme.`
            : "Nenhum campo novo encontrado para preencher.")
      );
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="industrial-panel p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-xs font-semibold tracking-widest text-muted uppercase">Pesquisa</h3>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Cole textos de consultas, processos e cadastros. Use a extração para preencher todos os
              campos automaticamente.
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
        <section className="industrial-panel space-y-4 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div>
              <h4 className="text-xs font-semibold tracking-widest text-muted uppercase">
                Extração automática
              </h4>
              <p className="mt-1 text-sm text-muted">
                Identifica CPF, nome, datas, telefones e endereços — preenche, marca telefones como
                válidos e salva.
              </p>
            </div>
            {clientId && onExtractAndApply && (
              <button
                type="button"
                className="btn-primary w-full shrink-0 sm:w-auto"
                disabled={disabled || extracting || !value.trim()}
                onClick={() => void handleExtractAll()}
              >
                <Icon name="fileText" className="h-4 w-4" />
                {extracting ? "Extraindo..." : "Extrair e preencher tudo"}
              </button>
            )}
          </div>

          {extractMsg && <p className="alert alert-success">{extractMsg}</p>}

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
  onExtractComplete,
}: {
  client: ClientProfileData;
  disabled?: boolean;
  latestPhoneChecks?: Partial<Record<string, PhoneCheckResult>>;
  onUpdated: (client: ClientProfileData) => void;
  onPhoneCheckRecorded?: () => void;
  onExtractComplete?: (filledFields: string[], overwrittenFields: string[]) => void;
}) {
  const [text, setText] = useState(client.pesquisa ?? "");
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
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

  async function extractAndApply() {
    if (disabled || !text.trim()) return null;

    setExtracting(true);
    try {
      if (text !== (client.pesquisa ?? "")) {
        await patchField("pesquisa", text);
      }

      const plan = buildExtractionApplyPlan(text, toClientSnapshot(client));
      if (Object.keys(plan.fields).length === 0 && plan.phoneChecks.length === 0) {
        const found = Object.entries(plan.parsed.scalars).filter(([, v]) => v);
        if (found.length > 0) {
          return {
            filledCount: 0,
            message:
              "Dados identificados no texto, mas iguais aos já cadastrados. Use «Ver detalhes da extração» para conferir.",
          };
        }
        return { filledCount: 0 };
      }

      const res = await fetch(`/api/clients/${client.id}/apply-extraction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: plan.fields,
          phoneChecks: plan.phoneChecks,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha na extração");

      onUpdated(data.client);
      onPhoneCheckRecorded?.();
      onExtractComplete?.(plan.filledFields, plan.overwrittenFields);
      const overwrittenCount = plan.overwrittenFields.length;
      return {
        filledCount: plan.filledFields.length,
        message:
          overwrittenCount > 0
            ? `${plan.filledFields.length} campo(s) atualizado(s) (${overwrittenCount} substituído(s)). Revise na aba Revisão antes de confirmar.`
            : undefined,
      };
    } finally {
      setExtracting(false);
    }
  }

  return (
    <ClientPesquisaSection
      value={text}
      onChange={handleChange}
      readOnly={!!disabled}
      saving={saving}
      extracting={extracting}
      formValues={toClientSnapshot(client)}
      clientId={client.id}
      latestPhoneChecks={latestPhoneChecks}
      disabled={disabled}
      onApplyPhone={(key, value) => {
        void patchField(key, value);
      }}
      onApplyAddress={(key, value) => {
        void patchField(key, value);
      }}
      onPhoneCheckRecorded={() => {
        onPhoneCheckRecorded?.();
        void fetch(`/api/clients/${client.id}`)
          .then((r) => r.json())
          .then((d) => {
            if (d.client) onUpdated(d.client);
          });
      }}
      onExtractAndApply={extractAndApply}
    />
  );
}
