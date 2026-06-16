"use client";

import { useCallback, useEffect, useState } from "react";
import { COMMUNICATION_LABELS } from "@/lib/client-history";
import { Icon } from "./ui/Icon";

type Template = {
  id: string;
  name: string;
  body: string;
};

export function ClientHistoryComposer({
  clientId,
  teamId,
  disabled,
  onSaved,
}: {
  clientId: string;
  teamId: string | null;
  disabled?: boolean;
  onSaved: () => void;
}) {
  const [type, setType] = useState<"CALL" | "WHATSAPP" | "NOTE">("NOTE");
  const [note, setNote] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    if (!teamId) return;
    const params = new URLSearchParams({ teamId });
    const res = await fetch(`/api/message-templates?${params}`);
    const data = await res.json();
    if (res.ok) setTemplates(data.templates ?? []);
  }, [teamId]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setPosting(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/history/note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, note: note.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao salvar");
      setNote("");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    } finally {
      setPosting(false);
    }
  }

  async function saveTemplate() {
    if (!teamId || !newTemplateName.trim() || !note.trim()) return;
    const res = await fetch("/api/message-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamId,
        name: newTemplateName.trim(),
        body: note.trim(),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Falha ao salvar template");
      return;
    }
    setNewTemplateName("");
    await loadTemplates();
  }

  return (
    <div className="space-y-4">
      <form className="panel-solid space-y-3 p-4" onSubmit={(e) => void submit(e)}>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(COMMUNICATION_LABELS) as Array<keyof typeof COMMUNICATION_LABELS>).map(
            (key) => (
              <button
                key={key}
                type="button"
                disabled={disabled}
                onClick={() => setType(key)}
                className={`rounded-[var(--radius-ui)] border px-3 py-1.5 text-xs font-medium transition-colors ${
                  type === key
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-muted hover:border-primary/40"
                }`}
              >
                {COMMUNICATION_LABELS[key]}
              </button>
            )
          )}
        </div>

        <textarea
          className="industrial-input min-h-[100px] resize-y"
          placeholder="Descreva a ligação, mensagem ou anotação..."
          value={note}
          disabled={disabled || posting}
          onChange={(e) => setNote(e.target.value)}
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            className="btn-ghost text-xs"
            disabled={!teamId}
            onClick={() => setShowTemplates((v) => !v)}
          >
            <Icon name="fileText" className="h-3.5 w-3.5" />
            Templates
          </button>
          <button type="submit" className="btn-primary text-sm" disabled={disabled || posting || !note.trim()}>
            {posting ? "Salvando..." : "Registrar no histórico"}
          </button>
        </div>
      </form>

      {showTemplates && teamId && (
        <section className="panel-solid space-y-3 p-4">
          <h3 className="text-xs font-semibold tracking-widest text-muted uppercase">
            Templates da equipe
          </h3>
          {templates.length === 0 ? (
            <p className="text-sm text-muted">Nenhum template salvo.</p>
          ) : (
            <ul className="space-y-2">
              {templates.map((tpl) => (
                <li
                  key={tpl.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-ui)] border border-border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{tpl.name}</p>
                    <p className="line-clamp-2 text-xs text-muted">{tpl.body}</p>
                  </div>
                  <button
                    type="button"
                    className="btn-ghost px-2 py-1 text-xs"
                    onClick={() => setNote(tpl.body)}
                  >
                    Usar
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-2 border-t border-border pt-3">
            <input
              className="industrial-input min-w-[140px] flex-1"
              placeholder="Nome do novo template"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
            />
            <button
              type="button"
              className="btn-ghost text-xs"
              disabled={!newTemplateName.trim() || !note.trim()}
              onClick={() => void saveTemplate()}
            >
              Salvar texto atual como template
            </button>
          </div>
        </section>
      )}

      {error && <p className="alert alert-error text-xs">{error}</p>}
    </div>
  );
}
