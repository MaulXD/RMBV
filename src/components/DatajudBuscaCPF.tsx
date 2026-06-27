"use client";

import { useState } from "react";

type Status = "idle" | "checking" | "found" | "empty";

export type DatajudProcesso = {
  numeroProcesso: string;
  tribunal: string;
  classe?: string | null;
  assunto?: string | null;
  vara?: string | null;
  dataAjuizamento?: string | null;
  valorAcao?: number | null;
  jaImportado?: boolean;
};

const GRUPOS = [
  {
    id: "trf",
    label: "TRFs",
    tribunais: ["trf1", "trf2", "trf3", "trf4", "trf5", "trf6"],
  },
  {
    id: "tj",
    label: "Tribunais de Justiça",
    tribunais: [
      "tjsp", "tjmg", "tjrj", "tjrs", "tjpr", "tjba", "tjce", "tjpe", "tjgo", "tjsc",
      "tjdft", "tjms", "tjmt", "tjma", "tjes", "tjpb", "tjpa", "tjpi", "tjam", "tjal",
      "tjse", "tjto", "tjrn", "tjac", "tjro", "tjap", "tjrr",
    ],
  },
  {
    id: "trt",
    label: "TRTs",
    tribunais: [
      "trt1", "trt2", "trt3", "trt4", "trt5", "trt6", "trt7", "trt8", "trt9", "trt10",
      "trt11", "trt12", "trt13", "trt14", "trt15", "trt16", "trt17", "trt18", "trt19",
      "trt20", "trt21", "trt22", "trt23", "trt24",
    ],
  },
];

function tribunalLabel(t: string) {
  const u = t.toUpperCase();
  if (/^TRF\d$/.test(u)) return `TRF ${u.slice(3)}`;
  if (/^TRT\d+$/.test(u)) return `TRT ${u.slice(3)}`;
  return u;
}

function StatusDot({ status }: { status?: Status }) {
  if (status === "checking") {
    return (
      <span className="inline-block h-2.5 w-2.5 shrink-0 animate-spin rounded-full border border-primary border-t-transparent" />
    );
  }
  if (status === "found") {
    return (
      <svg viewBox="0 0 10 10" className="inline-block h-2.5 w-2.5 shrink-0 text-emerald-500" fill="currentColor">
        <circle cx="5" cy="5" r="5" />
      </svg>
    );
  }
  if (status === "empty") {
    return <span className="inline-block h-px w-2.5 shrink-0 translate-y-[1px] rounded-full bg-muted/40" />;
  }
  return null;
}

export function DatajudBuscaCPF({
  endpoint,
  requestBody,
  onSelect,
  showJaImportado = false,
}: {
  endpoint: string;
  requestBody: Record<string, string>;
  onSelect?: (p: DatajudProcesso) => void;
  showJaImportado?: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(GRUPOS.flatMap((g) => g.tribunais))
  );
  const [statusMap, setStatusMap] = useState<Record<string, Status>>({});
  const [results, setResults] = useState<DatajudProcesso[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState("");

  function toggleTribunal(t: string) {
    if (buscando) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t); else next.add(t);
      return next;
    });
  }

  function toggleGroup(tribunais: string[], deselectAll: boolean) {
    if (buscando) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (deselectAll) tribunais.forEach((t) => next.delete(t));
      else tribunais.forEach((t) => next.add(t));
      return next;
    });
  }

  async function buscar() {
    if (selected.size === 0 || buscando) return;
    setBuscando(true);
    setError("");
    setResults([]);
    setStatusMap({});

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...requestBody, tribunais: Array.from(selected) }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setError(data.error ?? "Erro ao consultar");
        setBuscando(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const ev = JSON.parse(line) as {
              type: string;
              tribunal?: string;
              processos?: DatajudProcesso[];
            };
            if (ev.type === "checking" && ev.tribunal) {
              setStatusMap((prev) => ({ ...prev, [ev.tribunal!]: "checking" }));
            } else if (ev.type === "result" && ev.tribunal && ev.processos) {
              setStatusMap((prev) => ({ ...prev, [ev.tribunal!]: "found" }));
              setResults((prev) => [...(prev ?? []), ...ev.processos!]);
            } else if (ev.type === "checked" && ev.tribunal) {
              setStatusMap((prev) => ({ ...prev, [ev.tribunal!]: "empty" }));
            } else if (ev.type === "done") {
              setStatusMap((prev) => {
                const next = { ...prev };
                Object.keys(next).forEach((k) => {
                  if (next[k] === "checking") next[k] = "empty";
                });
                return next;
              });
            }
          } catch { /* malformed line */ }
        }
      }
    } catch {
      setError("Erro de conexão");
    } finally {
      setBuscando(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Tribunal checklist */}
      <div className="rounded-lg border border-border bg-surface p-3 space-y-3">
        {GRUPOS.map((grupo) => {
          const allSelected = grupo.tribunais.every((t) => selected.has(t));
          return (
            <div key={grupo.id}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">
                  {grupo.label}
                </span>
                <button
                  type="button"
                  className="text-[10px] text-primary underline underline-offset-2 disabled:opacity-40"
                  onClick={() => toggleGroup(grupo.tribunais, allSelected)}
                  disabled={buscando}
                >
                  {allSelected ? "Nenhum" : "Todos"}
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {grupo.tribunais.map((t) => {
                  const status = statusMap[t] as Status | undefined;
                  const isSelected = selected.has(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTribunal(t)}
                      disabled={buscando}
                      title={tribunalLabel(t)}
                      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium transition-colors disabled:cursor-not-allowed ${
                        isSelected
                          ? "border-primary/30 bg-primary/5 text-primary"
                          : "border-border text-muted/40"
                      }`}
                    >
                      <StatusDot status={isSelected ? status : undefined} />
                      {tribunalLabel(t)}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Search button */}
      <button
        type="button"
        onClick={buscar}
        disabled={buscando || selected.size === 0}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/5 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {buscando && (
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        )}
        {buscando
          ? "Consultando..."
          : `Buscar em ${selected.size} tribunal${selected.size !== 1 ? "is" : ""}`}
      </button>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* Results */}
      {results !== null && !buscando && results.length === 0 && (
        <p className="py-4 text-center text-xs text-muted">Nenhum processo encontrado</p>
      )}

      {results && results.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">
            {results.length} processo{results.length !== 1 ? "s" : ""} encontrado{results.length !== 1 ? "s" : ""}
            {buscando && " (parcial)"}
          </p>
          {results.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={onSelect ? () => onSelect(p) : undefined}
              disabled={!onSelect}
              className={`w-full rounded-lg border px-3 py-2.5 text-left text-xs transition-colors ${
                onSelect
                  ? "hover:border-primary/40 hover:bg-primary/5"
                  : "cursor-default"
              } ${p.jaImportado ? "opacity-50" : "border-border"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono font-medium text-primary">{p.numeroProcesso}</p>
                  <p className="text-[10px] text-muted">
                    {p.tribunal?.toUpperCase()}
                    {p.classe ? ` · ${p.classe}` : ""}
                  </p>
                  {p.assunto && (
                    <p className="truncate text-[10px] text-muted/70">{p.assunto}</p>
                  )}
                </div>
                <div className="shrink-0 text-right space-y-0.5">
                  {showJaImportado && p.jaImportado && (
                    <span className="block rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      Já importado
                    </span>
                  )}
                  {p.dataAjuizamento && (
                    <p className="text-[10px] text-muted/60">
                      {new Date(p.dataAjuizamento).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
