"use client";

import { useCallback, useEffect, useState } from "react";
import { taskHistoryTitle, type TaskHistoryEntry } from "@/lib/task-history";

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TaskHistoryPanel({
  taskId,
  refreshKey = 0,
}: {
  taskId: string;
  refreshKey?: number;
}) {
  const [entries, setEntries] = useState<TaskHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}/history`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao carregar histórico");
      setEntries(data.entries ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setPosting(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao salvar comentário");
      setNote("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    } finally {
      setPosting(false);
    }
  }

  return (
    <section className="flex min-h-0 flex-col rounded-[var(--radius-ui)] border border-border bg-surface-elevated">
      <header className="border-b border-border/60 px-4 py-3">
        <h3 className="text-xs font-semibold tracking-widest text-muted uppercase">Histórico</h3>
      </header>

      <form className="border-b border-border/60 p-3" onSubmit={(e) => void submitComment(e)}>
        <textarea
          className="industrial-input min-h-[72px] w-full resize-y text-sm"
          placeholder="Adicionar comentário..."
          value={note}
          disabled={posting}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="mt-2 flex justify-end">
          <button type="submit" className="btn-primary text-xs" disabled={posting || !note.trim()}>
            {posting ? "Salvando..." : "Comentar"}
          </button>
        </div>
      </form>

      <div className="max-h-[280px] flex-1 overflow-y-auto p-3">
        {loading ? (
          <p className="text-sm text-muted">Carregando...</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted">Nenhum registro ainda.</p>
        ) : (
          <ul className="space-y-3">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className={`rounded-[var(--radius-ui)] border px-3 py-2 text-sm ${
                  entry.type === "COMMENT"
                    ? "border-primary/25 bg-primary/5"
                    : "border-border bg-surface"
                }`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium">{taskHistoryTitle(entry)}</span>
                  <span className="text-[10px] text-muted">{formatWhen(entry.createdAt)}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted">{entry.createdBy.name}</p>
                {entry.note && (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{entry.note}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="alert alert-error m-3 mt-0 text-xs">{error}</p>}
    </section>
  );
}
