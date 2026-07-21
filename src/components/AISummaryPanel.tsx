"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  text: string;
  ts: number;
}

function getCached(clientId: string): string | null {
  try {
    const raw = localStorage.getItem(`ai-summary-${clientId}`);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.ts > CACHE_TTL_MS) {
      localStorage.removeItem(`ai-summary-${clientId}`);
      return null;
    }
    return entry.text;
  } catch {
    return null;
  }
}

function setCache(clientId: string, text: string) {
  try {
    const entry: CacheEntry = { text, ts: Date.now() };
    localStorage.setItem(`ai-summary-${clientId}`, JSON.stringify(entry));
  } catch {
    // ignore storage errors
  }
}

export function AISummaryPanel({ clientId }: { clientId: string }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate(force = false) {
    if (!force) {
      const cached = getCached(clientId);
      if (cached) {
        setSummary(cached);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/clients/${clientId}/ai-summary`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao gerar resumo.");
        return;
      }
      setCache(clientId, data.summary);
      setSummary(data.summary);
    } catch {
      setError("Erro de rede. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel-solid p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold tracking-widest text-muted uppercase">
          Resumo por IA
        </h2>

        {summary && !loading && (
          <button
            type="button"
            className="btn-ghost flex items-center gap-1.5 text-xs"
            onClick={() => generate(true)}
            title="Gerar novo resumo"
          >
            <Icon name="rotateCw" className="h-3.5 w-3.5 shrink-0" />
            Atualizar
          </button>
        )}
      </div>

      {!summary && !loading && (
        <div className="mt-3">
          <button
            type="button"
            className="btn-primary flex items-center gap-2 text-sm"
            onClick={() => generate(false)}
          >
            <Icon name="sparkles" className="h-4 w-4 shrink-0" />
            Gerar resumo com IA
          </button>
        </div>
      )}

      {loading && (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted">
          <Icon name="rotateCw" className="h-4 w-4 shrink-0 animate-spin" />
          Gerando resumo...
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-500">{error}</p>
      )}

      {summary && !loading && (
        <div
          className="mt-4 border-l-2 border-blue-500 pl-4"
          style={{ borderColor: "var(--color-accent, #3b82f6)" }}
        >
          <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
            {summary}
          </p>
        </div>
      )}
    </section>
  );
}
