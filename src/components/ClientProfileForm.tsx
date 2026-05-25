"use client";

import { useState } from "react";
import type { ClientProfileData } from "@/lib/client-fields";
import { STATUS_OPTIONS } from "@/lib/client-fields";
import type { ExtractionResult } from "@/lib/extract-types";
import { ClientExtractionSection } from "./ClientExtractionSection";
import { ClientFormFields, type ClientFormFieldKey } from "./ClientFormFields";
import { TeseSelect } from "./TeseSelect";
import { useTeseFilter } from "./TeseFilterProvider";

type Category = { id: string; name: string };

export function ClientProfileForm({
  client,
  categories: _categories,
  onSaved,
  readOnly = false,
}: {
  client: ClientProfileData;
  categories: Category[];
  onSaved: (client: ClientProfileData) => void;
  readOnly?: boolean;
}) {
  const { teses } = useTeseFilter();
  const [form, setForm] = useState(client);
  const [teseId, setTeseId] = useState(client.teseId ?? "");
  const [rawText, setRawText] = useState(client.rawExtractText ?? "");
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function setField(key: ClientFormFieldKey, value: string) {
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
      if (extracted.tese) {
        const match = teses.find(
          (t) => t.name.toLowerCase() === String(extracted.tese).toLowerCase()
        );
        if (match) setTeseId(match.id);
      }
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
          teseId: teseId || null,
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
      <section className="industrial-panel space-y-4 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TeseSelect
            value={teseId}
            onChange={setTeseId}
            required={false}
          />
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

        <ClientFormFields values={form} onChange={setField} readOnly={readOnly} />
      </section>

      {!readOnly && (
        <ClientExtractionSection
          rawText={rawText}
          onRawTextChange={setRawText}
          onExtract={handleExtract}
          extracting={extracting}
        />
      )}

      {!readOnly && (
        <div className="flex justify-end">
          <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {message && <p className="text-sm text-muted">{message}</p>}
    </div>
  );
}
