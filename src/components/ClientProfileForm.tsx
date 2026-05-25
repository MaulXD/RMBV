"use client";

import { useState } from "react";
import type { ClientProfileData } from "@/lib/client-fields";
import { CLIENT_FIELD_GROUPS, STATUS_OPTIONS } from "@/lib/client-fields";
import type { ExtractionResult } from "@/lib/extract-types";

type Category = { id: string; name: string };

export function ClientProfileForm({
  client,
  categories,
  onSaved,
  readOnly = false,
}: {
  client: ClientProfileData;
  categories: Category[];
  onSaved: (client: ClientProfileData) => void;
  readOnly?: boolean;
}) {
  const [form, setForm] = useState(client);
  const [rawText, setRawText] = useState(client.rawExtractText ?? "");
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function setField(key: keyof ClientProfileData, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleExtract() {
    if (!rawText.trim()) return;
    setExtracting(true);
    setError(null);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha na extração");
      const extracted = data as ExtractionResult;
      setForm((prev) => ({
        ...prev,
        ...extracted,
        name: extracted.name || prev.name,
      }));
      setMessage("Dados extraídos e aplicados ao formulário.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro na extração");
    } finally {
      setExtracting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const {
        id: _id,
        createdAt: _c,
        updatedAt: _u,
        categories: _cats,
        ...payload
      } = form;
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          rawExtractText: rawText,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao salvar");
      onSaved(data.client);
      setMessage("Cliente atualizado.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {!readOnly && (
        <section className="industrial-panel p-4">
          <h3 className="mb-3 text-xs font-semibold tracking-widest text-muted uppercase">
            Texto para extração
          </h3>
          <textarea
            className="terminal-textarea min-h-[200px]"
            placeholder="Cole o texto bruto para extrair COD, TESE, telefones, endereços..."
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
          />
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              className="btn-primary"
              onClick={handleExtract}
              disabled={extracting || !rawText.trim()}
            >
              {extracting ? "Extraindo..." : "Extrair com IA"}
            </button>
          </div>
        </section>
      )}

      <section className="industrial-panel space-y-4 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-muted">Status</label>
            <select
              className="industrial-input"
              value={form.status}
              disabled={readOnly}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  status: e.target.value as ClientProfileData["status"],
                }))
              }
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {CLIENT_FIELD_GROUPS.map((group) => (
          <fieldset key={group.title} className="space-y-3">
            <legend className="text-xs font-semibold tracking-widest text-muted uppercase">
              {group.title}
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {group.fields.map((field) => (
                <div
                  key={field.key}
                  className={field.key.startsWith("address") && field.key === "address1" ? "sm:col-span-2" : ""}
                >
                  <label className="mb-1 block text-xs text-muted">{field.label}</label>
                  <input
                    className="industrial-input"
                    disabled={readOnly}
                    value={String(form[field.key as keyof ClientProfileData] ?? "")}
                    onChange={(e) =>
                      setField(field.key as keyof ClientProfileData, e.target.value)
                    }
                  />
                </div>
              ))}
            </div>
          </fieldset>
        ))}

        {!readOnly && (
          <div className="flex justify-end pt-2">
            <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        )}
      </section>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {message && <p className="text-sm text-muted">{message}</p>}
    </div>
  );
}
