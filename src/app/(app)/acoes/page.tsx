"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "@/components/SessionProvider";
import { Icon } from "@/components/ui/Icon";
import { useDebounce } from "@/hooks/useDebounce";

type Acao = {
  id: string;
  numCNJ: string | null;
  numProcesso: string | null;
  valorCausa: number | null;
  advConfirmadoAt: string | null;
  docsEnviadosAt: string | null;
  entradaAt: string | null;
  sentencaAt: string | null;
  sentencaResultado: string | null;
  classe: string | null;
  assunto: string | null;
  vara: string | null;
  tribunal: string | null;
  ultimaMovimentacaoAt: string | null;
  ultimaMovimentacaoText: string | null;
  ultimaConsultaAt: string | null;
  consultaStatus: string | null;
  parteContraria: string | null;
  dataAjuizamento: string | null;
  dataDistribuicao: string | null;
  valorAtualizado: number | null;
  _count: { movimentacoes: number } | null;
  client: {
    id: string;
    name: string;
    cod: string | null;
    teseRef: { id: string; name: string; color: string | null } | null;
    status: string;
  };
};

type ClientResult = { id: string; label: string; sub?: string }

type ProcessoResumo = {
  numeroProcesso: string;
  tribunal: string;
  classe: string | null;
  assunto: string | null;
  vara: string | null;
  dataAjuizamento: string | null;
  valorAcao: number | null;
  jaImportado: boolean;
};

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
  const [numProcesso, setNumProcesso] = useState("");
  const [valorCausa, setValorCausa] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [buscandoCPF, setBuscandoCPF] = useState(false);
  const [progressCPF, setProgressCPF] = useState("");
  const [processosEncontrados, setProcessosEncontrados] = useState<ProcessoResumo[] | null>(null);
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

  const buscarPorCPF = async () => {
    if (!selected) return;
    setBuscandoCPF(true);
    setProcessosEncontrados([]);
    setProgressCPF("");
    setError("");
    try {
      const res = await fetch("/api/acoes/buscar-cpf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: selected.id }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setError(data.error ?? "Erro ao buscar processos");
        setBuscandoCPF(false);
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
            const ev = JSON.parse(line) as { type: string; tribunal?: string; processos?: ProcessoResumo[] };
            if (ev.type === "checking" && ev.tribunal) {
              setProgressCPF(`Verificando ${ev.tribunal.toUpperCase().replace(/^TRF(\d)/, "TRF $1").replace(/^TRT(\d+)/, "TRT $1")}...`);
            } else if (ev.type === "result" && ev.processos) {
              setProcessosEncontrados((prev) => [...(prev ?? []), ...ev.processos!]);
            } else if (ev.type === "done") {
              setProgressCPF("");
            }
          } catch { /* malformed line */ }
        }
      }
    } catch {
      setError("Erro de conexão");
    } finally {
      setBuscandoCPF(false);
      setProgressCPF("");
    }
  };

  const selecionarProcesso = (p: ProcessoResumo) => {
    setNumCNJ(p.numeroProcesso);
    setNumProcesso(p.numeroProcesso);
    setProcessosEncontrados(null);
  };

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
          numProcesso: numProcesso.trim() || null,
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

          {selected && (
            <div>
              <button
                type="button"
                onClick={buscarPorCPF}
                disabled={buscandoCPF}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/5 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
              >
                {buscandoCPF ? (
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                ) : (
                  <Icon name="search" className="h-3.5 w-3.5" />
                )}
                {buscandoCPF ? (progressCPF || "Consultando tribunais...") : "Buscar processos pelo CPF no Datajud"}
              </button>

              {processosEncontrados !== null && (
                <div className="mt-2 max-h-52 overflow-y-auto rounded-lg border border-border">
                  {processosEncontrados.length === 0 ? (
                    <p className="px-3 py-3 text-xs text-muted text-center">Nenhum processo encontrado para este CPF</p>
                  ) : (
                    <>
                      <p className="border-b border-border px-3 py-1.5 text-[10px] font-semibold text-muted uppercase tracking-wide">
                        {processosEncontrados.length} processo{processosEncontrados.length !== 1 ? "s" : ""} encontrado{processosEncontrados.length !== 1 ? "s" : ""}
                      </p>
                      {processosEncontrados.map((p) => (
                        <button
                          key={p.numeroProcesso}
                          type="button"
                          disabled={p.jaImportado}
                          onClick={() => selecionarProcesso(p)}
                          className="flex w-full flex-col gap-0.5 px-3 py-2 text-left text-xs hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed border-b border-border/40 last:border-0"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-primary">{p.numeroProcesso}</span>
                            {p.jaImportado && <span className="text-[10px] text-muted">já importado</span>}
                          </div>
                          <span className="text-muted">{[p.tribunal, p.vara].filter(Boolean).join(" · ")}</span>
                          {p.classe && <span className="text-muted/70">{p.classe}</span>}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

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
            <label className="mb-1 block text-xs font-medium text-muted">Número do Processo (opcional)</label>
            <input
              className="input w-full py-2 text-sm"
              placeholder="0000000-00.0000.0.00.0000"
              value={numProcesso}
              onChange={(e) => setNumProcesso(e.target.value)}
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
  const headers = ["Cliente", "COD", "Tese", "CNJ", "Processo", "Valor Causa", "Tribunal", "Vara", "Classe", "Parte Contrária", "Últ. Mov.", "Movimentações", "ADV confirmou", "Docs enviados", "Entrada", "Sentença", "Resultado"];
  const rows = acoes.map((a) => [
    a.client.name,
    a.client.cod ?? "",
    a.client.teseRef?.name ?? "",
    a.numCNJ ?? "",
    a.numProcesso ?? "",
    a.valorCausa != null ? a.valorCausa.toFixed(2).replace(".", ",") : "",
    a.tribunal ?? "",
    a.vara ?? "",
    a.classe ?? "",
    a.parteContraria ?? "",
    fmtDate(a.ultimaMovimentacaoAt) ?? "",
    a._count?.movimentacoes ?? 0,
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

  const [consulting, setConsulting] = useState<string | null>(null);
  const [processualModal, setProcessualModal] = useState<Acao | null>(null);
  const [movimentacoes, setMovimentacoes] = useState<Array<{ id: string; data: string; texto: string; tipo: string | null }>>([]);
  const [loadingMovs, setLoadingMovs] = useState(false);

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

  const consultarProcesso = async (acao: Acao) => {
    setConsulting(acao.id);
    try {
      const res = await fetch(`/api/acoes/${acao.id}/consultar`, { method: "POST" });
      if (res.ok) {
        const result = await res.json() as { novasMovimentacoes: number };
        setAcoes((prev) => prev.map((a) =>
          a.id === acao.id ? { ...a, consultaStatus: "sucesso", ultimaConsultaAt: new Date().toISOString() } : a
        ));
        if (result.novasMovimentacoes > 0) {
          load();
        }
      }
    } finally {
      setConsulting(null);
    }
  };

  const openProcessualModal = async (acao: Acao) => {
    setProcessualModal(acao);
    setLoadingMovs(true);
    try {
      const res = await fetch(`/api/acoes/${acao.id}/consultar`);
      if (res.ok) {
        const data = await res.json() as {
          movimentacoes: Array<{ id: string; data: string; texto: string; tipo: string | null }>;
          resumo: Record<string, unknown>;
        };
        setMovimentacoes(data.movimentacoes);
        setAcoes((prev) => prev.map((a) => a.id === acao.id ? { ...a, ...data.resumo } as Acao : a));
      }
    } finally {
      setLoadingMovs(false);
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
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left">
                <th className="px-4 py-3 font-medium text-muted">Cliente</th>
                <th className="px-4 py-3 font-medium text-muted">CNJ / Processo</th>
                <th className="px-3 py-3 font-medium text-muted">Tribunal</th>
                <th className="px-3 py-3 font-medium text-muted">Última mov.</th>
                <th className="px-3 py-3 text-center font-medium text-muted">Mov.</th>
                <th className="px-3 py-3 text-center font-medium text-muted">ADV</th>
                <th className="px-3 py-3 text-center font-medium text-muted">Docs</th>
                <th className="px-3 py-3 text-center font-medium text-muted">Entrada</th>
                <th className="px-3 py-3 text-center font-medium text-muted">Sentença</th>
                <th className="px-3 py-3 text-center font-medium text-muted"></th>
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
                    <button type="button" className="text-left" onClick={() => openProcessualModal(a)}>
                      {a.numCNJ ? (
                        <span className="font-mono text-xs text-primary underline underline-offset-2 decoration-primary/30">{a.numCNJ}</span>
                      ) : (
                        <span className="text-xs text-muted/40">—</span>
                      )}
                      {a.numProcesso && a.numProcesso !== a.numCNJ && (
                        <span className="ml-1 block text-[10px] text-muted/60">{a.numProcesso}</span>
                      )}
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    {a.tribunal ? (
                      <div>
                        <span className="text-xs text-foreground">{a.tribunal}</span>
                        {a.vara && <span className="block text-[10px] text-muted/60">{a.vara}</span>}
                      </div>
                    ) : (
                      <span className="text-xs text-muted/40">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {a.ultimaMovimentacaoAt ? (
                      <div>
                        <span className="text-xs text-muted">{fmtDate(a.ultimaMovimentacaoAt)}</span>
                        {a.ultimaMovimentacaoText && (
                          <span className="block max-w-[180px] truncate text-[10px] text-muted/60" title={a.ultimaMovimentacaoText}>
                            {a.ultimaMovimentacaoText}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted/40">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => openProcessualModal(a)}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                      title="Ver movimentações"
                    >
                      {a._count?.movimentacoes ?? 0}
                    </button>
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
                  <td className="px-3 py-3 text-center">
                    {a.numCNJ || a.numProcesso ? (
                      <button
                        type="button"
                        onClick={() => consultarProcesso(a)}
                        disabled={consulting === a.id}
                        className="btn-ghost px-2 py-1 text-xs opacity-0 group-hover:opacity-100 disabled:opacity-50"
                        title="Consultar Datajud"
                      >
                        {consulting === a.id ? (
                          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        ) : (
                          <Icon name="rotateCw" className="h-3.5 w-3.5 text-muted hover:text-primary" />
                        )}
                      </button>
                    ) : null}
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

      {/* Processual Modal */}
      {processualModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]">
          <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-surface-elevated shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold">Detalhes processuais</h2>
                <p className="text-xs text-muted">{processualModal.client.name}</p>
              </div>
              <button type="button" onClick={() => setProcessualModal(null)} className="rounded-lg p-1 text-muted hover:bg-surface">
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto p-5">
              {/* Resumo */}
              <div className="mb-4 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted">CNJ:</span>
                  <p className="font-mono text-foreground">{processualModal.numCNJ || "—"}</p>
                </div>
                <div>
                  <span className="text-muted">Processo:</span>
                  <p className="font-mono text-foreground">{processualModal.numProcesso || processualModal.numCNJ || "—"}</p>
                </div>
                <div>
                  <span className="text-muted">Tribunal:</span>
                  <p className="text-foreground">{processualModal.tribunal || "—"}</p>
                </div>
                <div>
                  <span className="text-muted">Vara:</span>
                  <p className="text-foreground">{processualModal.vara || "—"}</p>
                </div>
                <div>
                  <span className="text-muted">Classe:</span>
                  <p className="text-foreground">{processualModal.classe || "—"}</p>
                </div>
                <div>
                  <span className="text-muted">Parte contrária:</span>
                  <p className="text-foreground">{processualModal.parteContraria || "—"}</p>
                </div>
                {processualModal.dataDistribuicao && (
                  <div>
                    <span className="text-muted">Distribuição:</span>
                    <p className="text-foreground">{fmtDate(processualModal.dataDistribuicao)}</p>
                  </div>
                )}
                {processualModal.dataAjuizamento && (
                  <div>
                    <span className="text-muted">Ajuizamento:</span>
                    <p className="text-foreground">{fmtDate(processualModal.dataAjuizamento)}</p>
                  </div>
                )}
                {processualModal.valorAtualizado != null && (
                  <div className="col-span-2">
                    <span className="text-muted">Valor atualizado:</span>
                    <p className="text-foreground">
                      {processualModal.valorAtualizado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                  </div>
                )}
                {processualModal.ultimaConsultaAt && (
                  <div className="col-span-2">
                    <span className="text-muted">Última consulta:</span>
                    <p className="text-foreground">
                      {new Date(processualModal.ultimaConsultaAt).toLocaleString("pt-BR")}
                      {processualModal.consultaStatus === "erro" && (
                        <span className="ml-2 text-red-500">(erro)</span>
                      )}
                    </p>
                  </div>
                )}
              </div>

              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-semibold text-foreground">
                  Movimentações
                  {processualModal._count?.movimentacoes != null && (
                    <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-primary">{processualModal._count.movimentacoes}</span>
                  )}
                </h3>
                <button
                  type="button"
                  onClick={() => consultarProcesso(processualModal)}
                  disabled={consulting === processualModal.id}
                  className="btn-ghost flex items-center gap-1 px-2 py-1 text-xs"
                >
                  {consulting === processualModal.id ? (
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  ) : (
                    <Icon name="rotateCw" className="h-3 w-3" />
                  )}
                  Consultar Datajud
                </button>
              </div>

              {loadingMovs ? (
                <div className="flex justify-center py-8">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : movimentacoes.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border py-8 text-center">
                  <p className="text-xs text-muted">Nenhuma movimentação encontrada.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {movimentacoes.map((m) => (
                    <div key={m.id} className="rounded-lg border border-border bg-surface p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs text-foreground">{m.texto}</p>
                        <span className="shrink-0 text-[10px] text-muted">{fmtDate(m.data)}</span>
                      </div>
                      {m.tipo && <span className="mt-1 inline-block rounded bg-primary/5 px-1.5 py-0.5 text-[10px] text-muted">Cód. {m.tipo}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
