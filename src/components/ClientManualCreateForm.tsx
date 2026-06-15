"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  STATUS_OPTIONS,
  createEmptyClientForm,
  formValuesToCreatePayload,
  type ClientFormValues,
} from "@/lib/client-fields";
import { ClientFormFields, type ClientFormFieldKey } from "./ClientFormFields";
import { TeseSelect } from "./TeseSelect";
import { useTeseFilter } from "./TeseFilterProvider";
import { SelectField } from "./ui/SelectField";
import { Icon } from "./ui/Icon";

type Category = { id: string; name: string };

export function ClientManualCreateForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const { activeTeseId } = useTeseFilter();
  const [form, setForm] = useState<ClientFormValues>(createEmptyClientForm);
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [teseId, setTeseId] = useState(activeTeseId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setField(key: ClientFormFieldKey, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
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

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formValuesToCreatePayload(form, { teseId: teseId || null }),
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
          <SelectField label="Categoria *" value={categoryId} onChange={setCategoryId} required>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Status"
            value={form.status}
            onChange={(v) =>
              setForm((prev) => ({
                ...prev,
                status: v as ClientFormValues["status"],
              }))
            }
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </SelectField>
        </div>

        <ClientFormFields values={form} onChange={setField} requiredName />
      </section>

      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={() => router.push("/dashboard")}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          <Icon name="userPlus" className="h-4 w-4" />
          {saving ? "Cadastrando..." : "Cadastrar cliente"}
        </button>
      </div>

      {error && <p className="alert alert-error">{error}</p>}
    </form>
  );
}
