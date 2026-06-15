"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  STATUS_OPTIONS,
  createEmptyClientForm,
  formValuesToCreatePayload,
  type ClientFormValues,
} from "@/lib/client-fields";
import type { ExtractionResult } from "@/lib/extract-types";
import { ClientExtractionSection } from "./ClientExtractionSection";
import { ClientFormFields, type ClientFormFieldKey } from "./ClientFormFields";
import { TeseSelect } from "./TeseSelect";
import { useTeseFilter } from "./TeseFilterProvider";
import { useAppConfig } from "./useAppConfig";

type Category = { id: string; name: string };

export function ClientManualCreateForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const { activeTeseId, teses } = useTeseFilter();
  const { config: appConfig } = useAppConfig();
  const [form, setForm] = useState<ClientFormValues>(createEmptyClientForm);
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [teseId, setTeseId] = useState(activeTeseId ?? "");
  const [rawText, setRawText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function setField(key: ClientFormFieldKey, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function applyExtraction(data: ExtractionResult) {
    setForm((prev) => ({
      ...prev,
      cod: data.cod ?? prev.cod,
      name: data.name || prev.name,
      cpf: data.cpf ?? prev.cpf,
      birthDate: data.birthDate ?? prev.birthDate,
      obito: data.obito ?? prev.obito,
      deathDate: data.deathDate ?? prev.deathDate,
      phone1: data.phone1 ?? prev.phone1,
      phone2: data.phone2 ?? prev.phone2,
      phone3: data.phone3 ?? prev.phone3,
      phone4: data.phone4 ?? prev.phone4,
      phone5: data.phone5 ?? prev.phone5,
      phone6: data.phone6 ?? prev.phone6,
      phone7: data.phone7 ?? prev.phone7,
      phone8: data.phone8 ?? prev.phone8,
      phone9: data.phone9 ?? prev.phone9,
      phone10: data.phone10 ?? prev.phone10,
      address1: data.address1 ?? prev.address1,
      address2: data.address2 ?? prev.address2,
      address3: data.address3 ?? prev.address3,
    }));
    if (data.tese) {
      const match = teses.find(
        (t) => t.name.toLowerCase() === String(data.tese).toLowerCase()
      );
      if (match) setTeseId(match.id);
    }
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
      applyExtraction(data);
      setMessage("Dados extraídos e preenchidos no formulário.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro na extração");
    } finally {
      setExtracting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("O campo NOME é obrigatório.");
      return;
    }
    if (!categoryId) {
      setError("Selecione uma categoria.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formValuesToCreatePayload(form, { rawExtractText: rawText, teseId: teseId || null }),
          categoryId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao cadastrar");
      router.push(`/clients/${data.client.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao cadastrar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="industrial-panel space-y-4 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TeseSelect value={teseId} onChange={setTeseId} />
          <div>
            <label className="mb-1 block text-xs text-muted">Categoria *</label>
            <select
              className="industrial-input"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Status</label>
            <select
              className="industrial-input"
              value={form.status}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  status: e.target.value as ClientFormValues["status"],
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

        <ClientFormFields
          values={form}
          onChange={setField}
          requiredName
        />
      </section>

      <ClientExtractionSection
        rawText={rawText}
        onRawTextChange={setRawText}
        onExtract={handleExtract}
        extracting={extracting}
        optional
        aiAvailable={appConfig.openaiExtract}
        aiHint={appConfig.hints.openaiExtract}
      />

      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="btn-ghost"
          onClick={() => router.push("/dashboard")}
        >
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Cadastrando..." : "Cadastrar cliente"}
        </button>
      </div>

      {error && <p className="alert alert-error">{error}</p>}
      {message && <p className="alert alert-success">{message}</p>}
    </form>
  );
}
