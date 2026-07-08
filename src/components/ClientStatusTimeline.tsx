"use client";

import { useCallback, useEffect, useState } from "react";
import type { ClientHistoryEntry } from "@/lib/client-history";
import { StatusBadge } from "./StatusBadge";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ClientStatusTimeline({ clientId }: { clientId: string }) {
  const [entries, setEntries] = useState<ClientHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/history`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao carregar histórico");
      const all = (data.entries ?? []) as ClientHistoryEntry[];
      setEntries(all.filter((e) => e.type === "STATUS_CHANGE"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <p className="text-sm text-muted">Carregando timeline de status...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-14 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-border">
          <span className="h-2 w-2 rounded-full bg-border" />
        </div>
        <p className="text-sm text-muted">Nenhuma mudanca de status registrada ainda.</p>
      </div>
    );
  }

  const total = entries.length;

  return (
    <div className="relative pl-2">
      {/* Vertical connecting line */}
      <div
        className="absolute top-4 bottom-4 left-[1.625rem] w-px bg-border"
        aria-hidden
      />

      <ol className="space-y-5">
        {entries.map((entry, index) => (
          <li key={entry.id} className="relative flex items-start gap-4">
            {/* Timeline node */}
            <div
              className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-surface-elevated"
              aria-hidden
            >
              <span className="h-2 w-2 rounded-full bg-primary" />
            </div>

            <div className="panel-solid min-w-0 flex-1 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {entry.fromStatus ? (
                    <>
                      <StatusBadge status={entry.fromStatus} />
                      <span className="text-xs text-muted">→</span>
                      <StatusBadge status={entry.toStatus!} />
                    </>
                  ) : (
                    <StatusBadge status={entry.toStatus!} />
                  )}
                </div>
                <span className="shrink-0 text-[10px] text-muted">
                  {index + 1}/{total}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-1">
                <p className="text-xs font-medium text-foreground">
                  {entry.createdBy.name}
                </p>
                <time
                  dateTime={entry.createdAt}
                  className="text-[10px] text-muted"
                >
                  {formatDate(entry.createdAt)}
                </time>
              </div>
              {entry.note && (
                <p className="mt-1.5 border-t border-border/50 pt-1.5 text-xs italic text-muted">
                  {entry.note}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
