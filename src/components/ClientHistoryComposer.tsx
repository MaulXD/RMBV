"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { COMMUNICATION_LABELS } from "@/lib/client-history";
import { Icon } from "./ui/Icon";

type Template = {
  id: string;
  name: string;
  body: string;
};

type Member = {
  id: string;
  name: string;
  role: string;
};

function parseMentionIds(text: string, members: Member[]): string[] {
  const mentions = [...text.matchAll(/@([^\s@,\.!?;:'"()\[\]]+)/g)].map((m) =>
    m[1].trim().toLowerCase()
  );
  const ids: string[] = [];
  for (const mention of mentions) {
    const found = members.find((m) => m.name.toLowerCase().startsWith(mention));
    if (found && !ids.includes(found.id)) ids.push(found.id);
  }
  return ids;
}

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
  const [followUpDate, setFollowUpDate] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [members, setMembers] = useState<Member[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionAtIndex, setMentionAtIndex] = useState(-1);
  const [mentionHighlight, setMentionHighlight] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  useEffect(() => {
    if (!teamId) return;
    fetch("/api/teams/members")
      .then((r) => r.json())
      .then((d) => setMembers((d.members ?? []).filter((m: Member & { isActive?: boolean }) => m.isActive !== false)))
      .catch(() => {});
  }, [teamId]);

  const filteredMembers = mentionQuery
    ? members.filter((m) => m.name.toLowerCase().includes(mentionQuery.toLowerCase()))
    : members;

  function handleNoteChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value;
    setNote(text);

    const cursor = e.target.selectionStart ?? text.length;
    const before = text.slice(0, cursor);
    const atIdx = before.lastIndexOf("@");

    if (atIdx !== -1) {
      const query = before.slice(atIdx + 1);
      if (!query.includes("\n") && query.length < 40) {
        setMentionQuery(query);
        setMentionAtIndex(atIdx);
        setMentionHighlight(0);
        setMentionOpen(true);
        return;
      }
    }
    setMentionOpen(false);
  }

  function insertMention(member: Member) {
    const ta = textareaRef.current;
    if (!ta) return;
    const cursor = ta.selectionStart ?? note.length;
    const before = note.slice(0, mentionAtIndex);
    const after = note.slice(cursor);
    const insertion = `@${member.name} `;
    const newNote = before + insertion + after;
    setNote(newNote);
    setMentionOpen(false);
    setTimeout(() => {
      ta.focus();
      const pos = before.length + insertion.length;
      ta.setSelectionRange(pos, pos);
    }, 0);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!mentionOpen || filteredMembers.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMentionHighlight((h) => Math.min(h + 1, filteredMembers.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setMentionHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" || e.key === "Tab") {
      const member = filteredMembers[mentionHighlight];
      if (member) {
        e.preventDefault();
        insertMention(member);
      }
    } else if (e.key === "Escape") {
      setMentionOpen(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setPosting(true);
    setError(null);
    try {
      const followUpAt = followUpDate
        ? new Date(`${followUpDate}T12:00:00`).toISOString()
        : null;

      const mentionIds = parseMentionIds(note, members);

      const res = await fetch(`/api/clients/${clientId}/history/note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, note: note.trim(), followUpAt, mentionIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao salvar");
      setNote("");
      setFollowUpDate("");
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

        {/* Textarea with mention dropdown */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            className="industrial-input min-h-[100px] resize-y"
            placeholder="Descreva a ligação, mensagem ou anotação... Use @nome para mencionar alguém"
            value={note}
            disabled={disabled || posting}
            onChange={handleNoteChange}
            onKeyDown={handleKeyDown}
            onBlur={() => setTimeout(() => setMentionOpen(false), 150)}
          />

          {mentionOpen && filteredMembers.length > 0 && (
            <div className="absolute bottom-full left-0 z-50 mb-1 max-h-48 w-56 overflow-y-auto rounded-lg border border-border bg-surface shadow-lg">
              <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted border-b border-border">
                Mencionar
              </div>
              {filteredMembers.map((m, i) => (
                <button
                  key={m.id}
                  type="button"
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                    i === mentionHighlight ? "bg-primary/10 text-primary" : "text-foreground hover:bg-surface-elevated"
                  }`}
                  onMouseDown={(e) => { e.preventDefault(); insertMention(m); }}
                  onMouseEnter={() => setMentionHighlight(i)}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                    {m.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="truncate">{m.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-ui)] border border-border bg-muted/5 px-3 py-2">
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <Icon name="bell" className="h-3.5 w-3.5" />
            <label htmlFor="follow-up-date" className="shrink-0">Retornar em:</label>
          </div>
          <input
            id="follow-up-date"
            type="date"
            className="industrial-input flex-1 text-xs"
            value={followUpDate}
            disabled={disabled || posting}
            onChange={(e) => setFollowUpDate(e.target.value)}
          />
          {followUpDate && (
            <button
              type="button"
              className="text-xs text-muted hover:text-foreground"
              onClick={() => setFollowUpDate("")}
              title="Remover lembrete"
            >
              <Icon name="x" className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

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
