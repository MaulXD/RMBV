"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "@/components/SessionProvider";
import { Icon } from "@/components/ui/Icon";
import { useDebounce } from "@/hooks/useDebounce";

type Acao = {
  id: string;
  numCNJ: string | null;
  valorCausa: number | null;
  advConfirmadoAt: string | null;
  docsEnviadosAt: string | null;
  entradaAt: string | null;
  sentencaAt: string | null;
  sentencaResultado: string | null;
  client: {
    id: string;
    name: string;
    cod: string | null;
    teseRef: { id: string; name: string; color: string | null } | null;
    status: string;
  };
};

type ClientResult = { id: string; label: string; sub?: string };

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function StageBtn({
  done,
  date,
  label,
  onClick,
  busy,
  canEdit,
}: {
  done: boolean;
  date: string | null;
  label: string;
  onClick: () => void;
  busy: boolean;
  canEdit: boolean;
}) {
  const base = "flex flex-col items-center gap-0.5 transition-opacity";
  const dot = done
    ? "h-2.5 w-2.5 rounded-full bg-emerald-500"
    : "h-2.5 w-2.5 rounded-full border-2 border-border";

  if (!canEdit) {
    return (
      <span className={base} title={done ? `${label}: ${fmtDate(date)}` : `${label}: pendente`}>
        <span className={dot} />
        {done && <span className="text-[10px] text-muted">{fmtDate(date)}</span>}
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      title={done ? `Desmarcar ${label}` : `Marcar ${label}`}
      className={`${base} rounded p-1 hover:bg-surface ${busy ? "opacity-40" : ""}`}
    >
      <span className={dot} />
      {done && <span className="text-[10px] text-muted">{fmtDate(date)}</span>}
    </button>
  );
}

function NovaAcaoModal({ onClose, onCreate }: { onClose: () => void; onCreate: (a: Acao) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClientResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<ClientResult | null>(null);
  const [numCNJ, setNumCNJ] = useState("");
  const [valorCausa, setValorCausa] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const debouncedQuery = useDebounce(query, 250);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (!debouncedQuery.trim() || selected) { setResults([]); return; }
    setSearching(true);
    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json())
      .then((d) => setResults((d.clients ?? []) as ClientResult[]))
      .catch(() => setResults([]))
      .finally(() => setSearching(false));
  }, [debouncedQuery, selected]);

  const handleSave = async () => {
    if (!selected) { setError("Selecione um cliente"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/acoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selected.id,
          numCNJ: numCNJ.trim() || null,
          valorCausa: valorCausa ? parseFloat(valorCausa.replace(",", ".")) : null,
        }),
      });
      if (!res.ok) { setError("Erro ao criar ação"); return; }
      const { acao } = await res.json() as { acao: Acao };
      onCreate(acao);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface-elevated shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">Nova Ação</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-surface">
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {/* Client search */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Cliente</label>
            {selected ? (
              <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{selected.label}</p>
                  {selected.sub && <p className="text-xs text-muted">{selected.sub}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => { setSelected(null); setQuery(""); setTimeout(() => inputRef.current?.focus(), 50); }}
                  className="text-muted hover:text-foreground"
                >
                  <Icon name="x" className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Icon name="search" className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                <input
                  ref={inputRef}
                  className="input w-full pl-8 pr-3 py-2 text-sm"
                  placeholder="Buscar cliente por nome ou código..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {(results.length > 0 || searching) && (
                  <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-52 overflow-y-auto rounded-lg border border-border bg-surface-elevated shadow-lg">
                    {searching && <p className="px-3 py-2 text-xs text-muted">Buscando...</p>}
                    {results.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-surface"
                        onClick={() => { setSelected(r); setQuery(""); setResults([]); }}
                      >
                        <span className="font-medium">{r.label}</span>
                        {r.sub && <span className="text-xs text-muted">{r.sub}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Número CNJ (opcional)</label>
            <input
              className="input w-full py-2 text-sm font-mono"
              placeholder="0000000-00.0000.0.00.0000"
              value={numCNJ}
              onChange={(e) => setNumCNJ(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Valor da causa (opcional)</label>
            <input
              className="input w-full py-2 text-sm"
              placeholder="0,00"
              value={valorCausa}
              onChange={(e) => setValorCausa(e.target.value.replace(/[^\d,.]/, ""))}
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button type="button" onClick={onClose} className="btn-ghost px-4 py-2 text-sm">Cancelar</button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !selected}
            className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Criar Ação"}
          </button>
        </div>
      </div>
    </div>
  );
}

function exportAcoesCSV(acoes: Acao[]) {
  const headers = ["Cliente", "COD", "Tese", "CNJ", "Valor Causa", "ADV confirmou", "Docs enviados", "Entrada", "Sentença", "Resultado"];
  const rows = acoes.map((a) => [
    a.client.name,
    a.client.cod ?? "",
    a.client.teseRef?.name ?? "",
    a.numCNJ ?? "",
    a.valorCausa != null ? a.valorCausa.toFixed(2).replace(".", ",") : "",
    fmtDate(a.advConfirmadoAt) ?? "",
    fmtDate(a.docsEnviadosAt) ?? "",
    fmtDate(a.entradaAt) ?? "",
    fmtDate(a.sentencaAt) ?? "",
    a.sentencaResultado ?? "",
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "acoes.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function AcoesPage() {
  const { user } = useSession();
  const [acoes, setAcoes] = useState<Acao[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [busyStage, setBusyStage] = useState<string | null>(null);

  const canEdit = !!user && ["ADMIN", "ADV", "GERENTE"].includes(user.role);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (stageFilter) params.set("stage", stageFilter);
      const res = await fetch(`/api/acoes?${params}`);
      if (res.ok) {
        const data = await res.json() as { acoes: Acao[] };
        setAcoes(data.acoes);
      }
    } finally {
      setLoading(false);
    }
  }, [stageFilter]);

  useEffect(() => { load(); }, [load]);

  const toggleStage = async (acaoId: string, field: string, currentValue: boolean) => {
    const key = `${acaoId}:${field}`;
    setBusyStage(key);
    try {
      const res = await fetch(`/api/acoes/${acaoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: !currentValue }),
      });
      if (res.ok) {
        const { acao: updated } = await res.json() as { acao: Acao };
        setAcoes((prev) => prev.map((a) => a.id === acaoId ? { ...a, ...updated } : a));
      }
    } finally {
      setBusyStage(null);
    }
  };

  if (!user) return null;

  const filtered = acoes.filter((a) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      a.client.name.toLowerCase().includes(q) ||
      (a.client.cod ?? "").toLowerCase().includes(q) ||
      (a.numCNJ ?? "").toLowerCase().includes(q) ||
      (a.client.teseRef?.name ?? "").toLowerCase().includes(q)
    );
  });

  const stats = {
    total: acoes.length,
    adv: acoes.filter((a) => a.advConfirmadoAt).length,
    docs: acoes.filter((a) => a.docsEnviadosAt).length,
    entrada: acoes.filter((a) => a.entradaAt).length,
    sentenca: acoes.filter((a) => a.sentencaAt).length,
  };

  return (
    <div className="space-y-6">
      {modalOpen && (
        <NovaAcaoModal
          onClose={() => setModalOpen(false)}
          onCreate={(a) => { setAcoes((prev) => [a, ...prev]); setModalOpen(false); }}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Ações</h1>
          <p className="text-sm text-muted">Processos judiciais e administrativos</p>
        </div>
        <div className="flex items-center gap-2">
          {!loading && filtered.length > 0 && (
            <button
              type="button"
              onClick={() => exportAcoesCSV(filtered)}
              className="btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-sm"
            >
              <Icon name="download" className="h-4 w-4" />
              CSV
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="btn-primary flex items-center gap-1.5 px-3 py-2 text-sm"
            >
              <Icon name="plus" className="h-4 w-4" />
              Nova Ação
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {!loading && acoes.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "ADV confirmou", value: stats.adv, color: "text-sky-500", bg: "bg-sky-500/10" },
            { label: "Docs enviados", value: stats.docs, color: "text-amber-500", bg: "bg-amber-500/10" },
            { label: "Deu entrada", value: stats.entrada, color: "text-violet-500", bg: "bg-violet-500/10" },
            { label: "Sentença", value: stats.sentenca, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl border border-border p-4 ${s.bg}`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted">{s.label}</p>
              <p className="mt-0.5 text-[10px] text-muted/60">de {stats.total} ações</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Icon name="search" className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <input
            className="input pl-8 pr-3 py-1.5 text-sm w-56"
            placeholder="Buscar cliente ou CNJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input py-1.5 text-sm"
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
        >
          <option value="">Todas as etapas</option>
          <option value="adv">ADV confirmou</option>
          <option value="docs">Docs enviados</option>
          <option value="entrada">Deu entrada</option>
          <option value="sentenca">Sentença</option>
        </select>
        {canEdit && (
          <p className="self-center text-xs text-muted/60">Clique nas etapas para marcar/desmarcar</p>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted">Nenhuma ação encontrada.</p>
          {canEdit && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="btn-primary mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm"
            >
              <Icon name="plus" className="h-4 w-4" />
              Nova Ação
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left">
                <th className="px-4 py-3 font-medium text-muted">Cliente</th>
                <th className="px-4 py-3 font-medium text-muted">CNJ</th>
                <th className="px-3 py-3 text-center font-medium text-muted">ADV</th>
                <th className="px-3 py-3 text-center font-medium text-muted">Docs</th>
                <th className="px-3 py-3 text-center font-medium text-muted">Entrada</th>
                <th className="px-3 py-3 text-center font-medium text-muted">Sentença</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((a) => (
                <tr key={a.id} className="group bg-surface-elevated transition-colors hover:bg-surface">
                  <td className="px-4 py-3">
                    <Link href={`/clients/${a.client.id}?tab=acoes`} className="block hover:underline">
                      <span className="font-medium text-foreground">{a.client.name}</span>
                      {a.client.cod && <span className="ml-2 text-xs text-muted">#{a.client.cod}</span>}
                    </Link>
                    {a.client.teseRef && (
                      <span
                        className="mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium"
                        style={{
                          background: a.client.teseRef.color ? `${a.client.teseRef.color}22` : undefined,
                          color: a.client.teseRef.color ?? undefined,
                        }}
                      >
                        {a.client.teseRef.name}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {a.numCNJ ? (
                      <span className="font-mono text-xs text-primary">{a.numCNJ}</span>
                    ) : (
                      <span className="text-xs text-muted/40">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <StageBtn
                      done={!!a.advConfirmadoAt}
                      date={a.advConfirmadoAt}
                      label="ADV confirmou"
                      onClick={() => toggleStage(a.id, "advConfirmado", !!a.advConfirmadoAt)}
                      busy={busyStage === `${a.id}:advConfirmado`}
                      canEdit={canEdit}
                    />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <StageBtn
                      done={!!a.docsEnviadosAt}
                      date={a.docsEnviadosAt}
                      label="Docs enviados"
                      onClick={() => toggleStage(a.id, "docsEnviados", !!a.docsEnviadosAt)}
                      busy={busyStage === `${a.id}:docsEnviados`}
                      canEdit={canEdit}
                    />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <StageBtn
                      done={!!a.entradaAt}
                      date={a.entradaAt}
                      label="Deu entrada"
                      onClick={() => toggleStage(a.id, "entrada", !!a.entradaAt)}
                      busy={busyStage === `${a.id}:entrada`}
                      canEdit={canEdit}
                    />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <StageBtn
                      done={!!a.sentencaAt}
                      date={a.sentencaAt}
                      label="Sentença"
                      onClick={() => toggleStage(a.id, "sentenca", !!a.sentencaAt)}
                      busy={busyStage === `${a.id}:sentenca`}
                      canEdit={canEdit}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-border px-4 py-2 text-xs text-muted">
            {filtered.length} ação{filtered.length !== 1 ? "ões" : ""}
          </div>
        </div>
      )}
    </div>
  );
}
