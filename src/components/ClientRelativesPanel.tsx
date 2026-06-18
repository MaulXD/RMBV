"use client";

import { useEffect, useState } from "react";
import { CopyButton } from "./CopyButton";
import { WhatsAppButton } from "./WhatsAppButton";

const RELATIONSHIP_OPTIONS = [
  "Mãe", "Pai", "Filho", "Filha", "Irmão", "Irmã",
  "Avô", "Avó", "Esposo", "Esposa", "Cônjuge",
  "Tio", "Tia", "Sobrinho", "Sobrinha",
  "Neto", "Neta", "Primo", "Prima",
  "Cunhado", "Cunhada", "Sogro", "Sogra", "Outro",
];

type Relative = {
  id: string;
  name: string;
  relationship: string;
  phone1: string | null;
  phone2: string | null;
  phone3: string | null;
  notes: string | null;
};

type Suggestion = {
  relationship: string;
  name: string;
  phone1: string;
  phone2: string;
  rawBlock: string;
};

type FormState = {
  name: string;
  relationship: string;
  phone1: string;
  phone2: string;
  phone3: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  name: "", relationship: "", phone1: "", phone2: "", phone3: "", notes: "",
};

function RelativeForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: FormState;
  onSave: (f: FormState) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const set = (k: keyof FormState, v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-muted">Nome</label>
          <input
            className="industrial-input w-full"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Nome completo"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">Parentesco</label>
          <select
            className="industrial-input w-full"
            value={form.relationship}
            onChange={(e) => set("relationship", e.target.value)}
          >
            <option value="">Selecionar</option>
            {RELATIONSHIP_OPTIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {(["phone1", "phone2", "phone3"] as const).map((k, i) => (
          <div key={k}>
            <label className="mb-1 block text-xs text-muted">Telefone {i + 1}</label>
            <input
              className="industrial-input w-full"
              value={form[k]}
              onChange={(e) => set(k, e.target.value)}
              placeholder="(00) 00000-0000"
            />
          </div>
        ))}
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted">Observações</label>
        <input
          className="industrial-input w-full"
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Opcional"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className="btn-primary"
          onClick={() => onSave(form)}
          disabled={saving || !form.name.trim() || !form.relationship}
        >
          {saving ? "Salvando..." : "Salvar"}
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

function RelativeCard({
  relative,
  onEdit,
  onDelete,
}: {
  relative: Relative;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const phones = [relative.phone1, relative.phone2, relative.phone3].filter(Boolean) as string[];

  return (
    <div className="panel-solid p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
              {relative.relationship}
            </span>
            <p className="text-sm font-semibold text-foreground truncate">{relative.name}</p>
          </div>
          {phones.length > 0 && (
            <div className="mt-2 space-y-1">
              {phones.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-muted font-mono">{p}</span>
                  <CopyButton value={p} compact />
                  <WhatsAppButton value={p} compact />
                </div>
              ))}
            </div>
          )}
          {relative.notes && (
            <p className="mt-1.5 text-xs text-muted">{relative.notes}</p>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            className="btn-icon-bordered"
            title="Editar"
            onClick={onEdit}
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11.5 2.5a1.414 1.414 0 0 1 2 2L5 13H3v-2L11.5 2.5Z" />
            </svg>
          </button>
          <button
            type="button"
            className="btn-icon-bordered hover:border-red-400/50 hover:bg-red-500/[0.08] hover:text-red-600 dark:hover:text-red-400"
            title="Remover"
            onClick={onDelete}
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export function ClientRelativesPanel({ clientId }: { clientId: string }) {
  const [relatives, setRelatives] = useState<Relative[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [identifying, setIdentifying] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    void load();
  }, [clientId]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/relatives`);
      if (res.ok) setRelatives(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(form: FormState) {
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/relatives`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setAdding(false);
        await load();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(id: string, form: FormState) {
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/relatives/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setEditingId(null);
        await load();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este parente?")) return;
    await fetch(`/api/clients/${clientId}/relatives/${id}`, { method: "DELETE" });
    await load();
  }

  async function handleIdentify() {
    setIdentifying(true);
    setSuggestions([]);
    try {
      const res = await fetch(`/api/clients/${clientId}/relatives/identify`, { method: "POST" });
      const json = await res.json();
      setSuggestions(json.suggestions ?? []);
    } finally {
      setIdentifying(false);
    }
  }

  async function confirmSuggestion(s: Suggestion) {
    await handleAdd({
      name: s.name,
      relationship: s.relationship,
      phone1: s.phone1,
      phone2: s.phone2,
      phone3: "",
      notes: "",
    });
    setSuggestions((prev) => prev.filter((x) => x !== s));
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-semibold text-foreground">Parentes</h3>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-ghost text-xs"
            onClick={() => void handleIdentify()}
            disabled={identifying}
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="6" cy="6" r="4" />
              <path d="m10 10 3.5 3.5" />
            </svg>
            {identifying ? "Identificando..." : "Identificar na pesquisa"}
          </button>
          {!adding && (
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={() => setAdding(true)}
            >
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M8 2v12M2 8h12" />
              </svg>
              Adicionar
            </button>
          )}
        </div>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
            {suggestions.length} parente{suggestions.length > 1 ? "s" : ""} identificado{suggestions.length > 1 ? "s" : ""} na pesquisa — confirme para salvar:
          </p>
          {suggestions.map((s, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl border border-amber-300/40 bg-amber-50/60 p-3 dark:border-amber-700/30 dark:bg-amber-900/10">
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                    {s.relationship}
                  </span>
                  {s.name && <span className="text-sm font-medium text-foreground">{s.name}</span>}
                </div>
                {[s.phone1, s.phone2].filter(Boolean).map((p, pi) => (
                  <p key={pi} className="text-xs text-muted font-mono">{p}</p>
                ))}
                <details className="mt-1">
                  <summary className="cursor-pointer text-[10px] text-muted hover:text-foreground">Ver trecho original</summary>
                  <pre className="mt-1 whitespace-pre-wrap text-[10px] text-muted leading-relaxed">{s.rawBlock}</pre>
                </details>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button
                  type="button"
                  className="btn-ghost px-2.5 py-1 text-xs text-emerald-700 dark:text-emerald-400"
                  onClick={() => void confirmSuggestion(s)}
                >
                  Confirmar
                </button>
                <button
                  type="button"
                  className="btn-ghost px-2.5 py-1 text-xs"
                  onClick={() => setSuggestions((prev) => prev.filter((_, ii) => ii !== i))}
                >
                  Ignorar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {suggestions.length === 0 && !identifying && relatives.length === 0 && !loading && !adding && (
        <p className="text-xs text-muted">Nenhum parente cadastrado.</p>
      )}

      {/* Add form */}
      {adding && (
        <div className="panel-solid p-4">
          <p className="mb-3 text-xs font-semibold text-foreground">Novo parente</p>
          <RelativeForm
            initial={EMPTY_FORM}
            onSave={(f) => void handleAdd(f)}
            onCancel={() => setAdding(false)}
            saving={saving}
          />
        </div>
      )}

      {/* List */}
      {loading ? (
        <p className="text-xs text-muted">Carregando...</p>
      ) : (
        <div className="space-y-2">
          {relatives.map((r) =>
            editingId === r.id ? (
              <div key={r.id} className="panel-solid p-4">
                <p className="mb-3 text-xs font-semibold text-foreground">Editar parente</p>
                <RelativeForm
                  initial={{
                    name: r.name,
                    relationship: r.relationship,
                    phone1: r.phone1 ?? "",
                    phone2: r.phone2 ?? "",
                    phone3: r.phone3 ?? "",
                    notes: r.notes ?? "",
                  }}
                  onSave={(f) => void handleEdit(r.id, f)}
                  onCancel={() => setEditingId(null)}
                  saving={saving}
                />
              </div>
            ) : (
              <RelativeCard
                key={r.id}
                relative={r}
                onEdit={() => setEditingId(r.id)}
                onDelete={() => void handleDelete(r.id)}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}
