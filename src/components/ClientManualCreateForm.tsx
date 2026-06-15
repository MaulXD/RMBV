"use client";

import { useEffect, useState } from "react";
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
import { ClientResearchTools } from "./ClientResearchTools";

type Category = { id: string; name: string };
type TeamOption = { id: string; name: string };

export function ClientManualCreateForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const { activeTeseId, teses } = useTeseFilter();
  const [form, setForm] = useState<ClientFormValues>(createEmptyClientForm);
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [teseId, setTeseId] = useState(activeTeseId ?? "");
  const [teamId, setTeamId] = useState("");
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [researchText, setResearchText] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        const admin = d.user?.role === "ADMIN";
        setIsAdmin(admin);
        if (admin) {
          return fetch("/api/teams")
            .then((r) => r.json())
            .then((data) => {
              const list = (data.teams ?? []).map((t: TeamOption) => ({
                id: t.id,
                name: t.name,
              }));
              setTeams(list);
              if (list[0]) setTeamId(list[0].id);
            });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isAdmin || !teseId) return;
    const tese = teses.find((t) => t.id === teseId);
    if (tese?.teamId) setTeamId(tese.teamId);
  }, [isAdmin, teseId, teses]);

  function setField(key: ClientFormFieldKey, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleTeamChange(nextTeamId: string) {
    setTeamId(nextTeamId);
    const current = teses.find((t) => t.id === teseId);
    if (current?.teamId && current.teamId !== nextTeamId) {
      setTeseId("");
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
    if (isAdmin && !teamId) {
      setError("Selecione a equipe.");
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
          ...(researchText.trim() ? { rawExtractText: researchText.trim() } : {}),
          ...(isAdmin && teamId ? { teamId } : {}),
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
          {isAdmin && (
            <SelectField
              label="Equipe *"
              value={teamId}
              onChange={handleTeamChange}
              required
            >
              {teams.length === 0 ? (
                <option value="">Nenhuma equipe — crie em Administração</option>
              ) : (
                teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))
              )}
            </SelectField>
          )}
          <TeseSelect
            value={teseId}
            onChange={setTeseId}
            teamIdFilter={isAdmin && teamId ? teamId : undefined}
          />
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

      <ClientResearchTools
        formValues={form}
        onApplyPhone={(key, value) => setField(key as ClientFormFieldKey, value)}
        onApplyAddress={(key, value) => setField(key as ClientFormFieldKey, value)}
        onTextChange={setResearchText}
      />

      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={() => router.push("/dashboard")}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={saving || (isAdmin && teams.length === 0)}>
          <Icon name="userPlus" className="h-4 w-4" />
          {saving ? "Cadastrando..." : "Cadastrar cliente"}
        </button>
      </div>

      {error && <p className="alert alert-error">{error}</p>}
    </form>
  );
}
