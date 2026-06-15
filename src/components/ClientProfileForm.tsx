"use client";

import { useEffect, useState } from "react";
import type { ClientProfileData } from "@/lib/client-fields";
import { STATUS_OPTIONS } from "@/lib/client-fields";
import { ClientFormFields, type ClientFormFieldKey } from "./ClientFormFields";
import { TeseSelect } from "./TeseSelect";
type Category = { id: string; name: string };

export function ClientProfileForm({
  client,
  categories: _categories,
  onSaved,
  readOnly = false,
  latestPhoneChecks,
  onPhoneCheckRecorded,
  phoneActionsDisabled,
  onHistoryRefresh,
}: {
  client: ClientProfileData;
  categories: Category[];
  onSaved: (client: ClientProfileData) => void;
  readOnly?: boolean;
  latestPhoneChecks?: Partial<
    Record<string, import("@prisma/client").PhoneCheckResult>
  >;
  onPhoneCheckRecorded?: () => void;
  phoneActionsDisabled?: boolean;
  onHistoryRefresh?: () => void;
}) {
  const [form, setForm] = useState(client);
  const [teseId, setTeseId] = useState(client.teseId ?? "");

  useEffect(() => {
    setForm(client);
    setTeseId(client.teseId ?? "");
  }, [client]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusChangeNote, setStatusChangeNote] = useState("");
  const initialStatus = client.status;
  const statusChanged = form.status !== initialStatus;

  function setField(key: ClientFormFieldKey, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setMessage(null);
    if (statusChanged && statusChangeNote.trim().length < 3) {
      setError("Ao alterar o status, descreva o motivo no histórico (mínimo 3 caracteres).");
      setSaving(false);
      return;
    }

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
          ...(statusChanged
            ? { statusChangeNote: statusChangeNote.trim() }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao salvar");
      onSaved(data.client);
      setStatusChangeNote("");
      onHistoryRefresh?.();
      setMessage("Cliente atualizado.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="industrial-panel space-y-4 p-4 sm:p-5">
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

        {statusChanged && !readOnly && (
          <div>
            <label className="mb-1 block text-xs text-muted">
              Observação para o histórico (obrigatória ao mudar status) *
            </label>
            <textarea
              className="industrial-input min-h-[80px] resize-y"
              value={statusChangeNote}
              onChange={(e) => setStatusChangeNote(e.target.value)}
              placeholder="Descreva o motivo da mudança de status..."
              required
            />
          </div>
        )}

        <ClientFormFields
          values={form}
          onChange={setField}
          readOnly={readOnly}
          clientId={client.id}
          latestPhoneChecks={latestPhoneChecks}
          onPhoneCheckRecorded={() => {
            onPhoneCheckRecorded?.();
            onHistoryRefresh?.();
          }}
          phoneActionsDisabled={phoneActionsDisabled}
        />

        {!readOnly && (
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border/60 pt-4">
            {error && <p className="alert alert-error mr-auto min-w-0 flex-1">{error}</p>}
            {message && !error && (
              <p className="alert alert-success mr-auto min-w-0 flex-1">{message}</p>
            )}
            <button
              type="button"
              className="btn-primary shrink-0"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        )}
      </section>

      {readOnly && error && <p className="alert alert-error">{error}</p>}
      {readOnly && message && <p className="alert alert-success">{message}</p>}
    </div>
  );
}
