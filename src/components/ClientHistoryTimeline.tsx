"use client";

import { useCallback, useEffect, useState } from "react";
import type { PhoneCheckResult } from "@prisma/client";
import {
  historyEntryTitle,
  PHONE_CHECK_LABELS,
  communicationTypeLabel,
  statusLabel,
  type ClientHistoryEntry,
} from "@/lib/client-history";
import { StatusBadge } from "./StatusBadge";

function formatWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDayMarker(iso: string) {
  const d = new Date(iso);
  const day = d.toLocaleDateString("pt-BR", { day: "2-digit" });
  const month = d
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(".", "")
    .toUpperCase();
  const year = d.getFullYear();
  return { day, month, year };
}

export function ClientHistoryTimeline({
  clientId,
  refreshKey = 0,
}: {
  clientId: string;
  refreshKey?: number;
}) {
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
      setEntries(data.entries ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (loading) {
    return <p className="text-sm text-muted">Carregando histórico...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  }

  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted">
        Nenhum registro ainda. Comunicações, mudanças de status e verificações de telefone aparecem aqui.
      </p>
    );
  }

  return (
    <div className="relative space-y-0 pl-2">
      <div
        className="absolute top-2 bottom-2 left-[3.25rem] w-px bg-border"
        aria-hidden
      />

      <ul className="space-y-6">
        {entries.map((entry) => {
          const marker = formatDayMarker(entry.createdAt);
          return (
            <li key={entry.id} className="relative flex gap-4">
              <div className="flex w-14 shrink-0 flex-col items-center pt-1">
                <div className="rounded bg-accent px-1.5 py-1 text-center text-[10px] leading-tight font-semibold text-white shadow-sm">
                  <div>{marker.day}</div>
                  <div className="tracking-wide">{marker.month}</div>
                  <div className="opacity-90">{marker.year}</div>
                </div>
              </div>

              <article className="panel-solid min-w-0 flex-1 overflow-hidden p-0">
                <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/10 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{entry.createdBy.name}</p>
                    <p className="text-xs text-muted">{formatWhen(entry.createdAt)}</p>
                  </div>
                  <span className="text-xs font-semibold tracking-wide text-muted uppercase">
                    {communicationTypeLabel(entry.type) ??
                      (entry.type === "STATUS_CHANGE" ? "Status" : "Telefone")}
                  </span>
                </header>

                <div className="space-y-2 px-3 py-3">
                  <h4 className="text-sm font-semibold">{historyEntryTitle(entry)}</h4>

                  {entry.type === "STATUS_CHANGE" && entry.toStatus && (
                    <div className="flex flex-wrap items-center gap-2">
                      {entry.fromStatus && (
                        <>
                          <StatusBadge status={entry.fromStatus} />
                          <span className="text-xs text-muted">→</span>
                        </>
                      )}
                      <StatusBadge status={entry.toStatus} />
                    </div>
                  )}

                  {entry.type === "PHONE_CHECK" && entry.phoneCheck && (
                    <p className="text-sm text-muted">
                      {entry.phoneNumber ? (
                        <>
                          <span className="font-medium text-foreground">
                            {entry.phoneNumber}
                          </span>
                          {" — "}
                        </>
                      ) : null}
                      {PHONE_CHECK_LABELS[entry.phoneCheck as PhoneCheckResult]}
                    </p>
                  )}

                  {entry.note && (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {entry.note}
                    </p>
                  )}

                  {entry.type === "STATUS_CHANGE" && entry.toStatus && !entry.note && (
                    <p className="text-xs text-muted">
                      {statusLabel(entry.toStatus)}
                    </p>
                  )}
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
