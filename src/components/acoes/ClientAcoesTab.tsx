"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";

type Stage = {
  at: string | null;
  byName: string | null;
  nota: string | null;
};

type Acao = {
  id: string;
  numCNJ: string | null;
  valorCausa: number | null;
  createdAt: string;
  createdBy: { name: string };
  advConfirmadoAt: string | null;
  advConfirmadoBy: { name: string } | null;
  advNota: string | null;
  docsEnviadosAt: string | null;
  docsEnviadosBy: { name: string } | null;
  docsNota: string | null;
  entradaAt: string | null;
  entradaBy: { name: string } | null;
  entradaNota: string | null;
  sentencaAt: string | null;
  sentencaBy: { name: string } | null;
  sentencaResultado: string | null;
  sentencaNota: string | null;
};

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("pt-BR");
}

function fmtCurrency(v: number | null) {
  if (v == null) return null;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function StageBadge({
  label,
  date,
  byName,
  nota,
  done,
  onToggle,
  onNotaChange,
  noteField,
  extra,
}: {
  label: string;
  date: string | null;
  byName: string | null;
  nota: string | null;
  done: boolean;
  onToggle: () => void;
  onNotaChange: (v: string) => void;
  noteField: string;
  extra?: React.ReactNode;
}) {
  const [editingNota, setEditingNota] = useState(false);
  const [localNota, setLocalNota] = useState(nota ?? "");

  return (
    <div className={`rounded-lg border p-3 transition-colors ${done ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-surface"}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggle}
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${done ? "border-emerald-500 bg-emerald-500 text-white" : "border-border hover:border-primary"}`}
            title={done ? "Desmarcar" : "Marcar como concluído"}
          >
            {done && <Icon name="check" className="h-3 w-3" />}
          </button>
          <span className={`text-sm font-medium ${done ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
            {label}
          </span>
        </div>
        {done && date && (
          <span className="text-xs text-muted">{fmtDate(date)}{byName ? ` · ${byName}` : ""}</span>
        )}
      </div>

      {extra}

      {done && (
        <div className="mt-2">
          {editingNota ? (
            <div className="flex gap-1">
              <input
                className="input flex-1 py-1 text-xs"
                value={localNota}
                onChange={(e) => setLocalNota(e.target.value)}
                placeholder="Anotação..."
                autoFocus
              />
              <button
                type="button"
                className="btn-ghost px-2 py-1 text-xs text-emerald-600"
                onClick={() => { onNotaChange(localNota); setEditingNota(false); }}
              >
                Salvar
              </button>
              <button
                type="button"
                className="btn-ghost px-2 py-1 text-xs text-muted"
                onClick={() => setEditingNota(false)}
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="text-left text-xs text-muted hover:text-foreground"
              onClick={() => { setLocalNota(nota ?? ""); setEditingNota(true); }}
            >
              {nota ? nota : <span className="italic">+ anotação</span>}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function AcaoCard({ acao, onUpdate, onDelete }: {
  acao: Acao;
  onUpdate: (id: string, patch: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editCNJ, setEditCNJ] = useState(false);
  const [cnj, setCnj] = useState(acao.numCNJ ?? "");
  const [editValor, setEditValor] = useState(false);
  const [valor, setValor] = useState(acao.valorCausa != null ? String(acao.valorCausa) : "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const patch = useCallback(async (data: Record<string, unknown>) => {
    setBusy(true);
    try { await onUpdate(acao.id, data); } finally { setBusy(false); }
  }, [acao.id, onUpdate]);

  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-4 shadow-sm">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="space-y-1">
          {editCNJ ? (
            <div className="flex gap-1">
              <input
                className="input py-1 text-xs w-52"
                value={cnj}
                onChange={(e) => setCnj(e.target.value)}
                placeholder="Número CNJ"
                autoFocus
              />
              <button type="button" className="btn-ghost px-2 py-1 text-xs text-emerald-600" onClick={() => { patch({ numCNJ: cnj || null }); setEditCNJ(false); }}>Salvar</button>
              <button type="button" className="btn-ghost px-2 py-1 text-xs text-muted" onClick={() => setEditCNJ(false)}>Cancelar</button>
            </div>
          ) : (
            <button type="button" className="text-left" onClick={() => setEditCNJ(true)}>
              {acao.numCNJ
                ? <span className="font-mono text-sm font-medium text-primary">{acao.numCNJ}</span>
                : <span className="text-xs italic text-muted">+ número CNJ</span>}
            </button>
          )}

          {editValor ? (
            <div className="flex gap-1">
              <input
                className="input py-1 text-xs w-36"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="Valor da causa (R$)"
                type="number"
                autoFocus
              />
              <button type="button" className="btn-ghost px-2 py-1 text-xs text-emerald-600" onClick={() => { patch({ valorCausa: valor ? parseFloat(valor) : null }); setEditValor(false); }}>Salvar</button>
              <button type="button" className="btn-ghost px-2 py-1 text-xs text-muted" onClick={() => setEditValor(false)}>Cancelar</button>
            </div>
          ) : (
            <button type="button" className="text-left" onClick={() => setEditValor(true)}>
              {acao.valorCausa != null
                ? <span className="text-xs text-muted">{fmtCurrency(acao.valorCausa)}</span>
                : <span className="text-xs italic text-muted">+ valor da causa</span>}
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          {confirmDelete ? (
            <>
              <button type="button" disabled={busy} className="btn-ghost px-2 py-1 text-xs text-red-500" onClick={() => onDelete(acao.id)}>Confirmar</button>
              <button type="button" className="btn-ghost px-2 py-1 text-xs text-muted" onClick={() => setConfirmDelete(false)}>Cancelar</button>
            </>
          ) : (
            <button type="button" className="btn-ghost p-1.5 text-muted hover:text-red-500" onClick={() => setConfirmDelete(true)}>
              <Icon name="trash" className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Stages */}
      <div className="space-y-2">
        <StageBadge
          label="ADV confirmou"
          date={acao.advConfirmadoAt}
          byName={acao.advConfirmadoBy?.name ?? null}
          nota={acao.advNota}
          done={!!acao.advConfirmadoAt}
          onToggle={() => patch({ advConfirmado: !acao.advConfirmadoAt })}
          onNotaChange={(v) => patch({ advNota: v || null })}
          noteField="advNota"
        />
        <StageBadge
          label="Documentos enviados"
          date={acao.docsEnviadosAt}
          byName={acao.docsEnviadosBy?.name ?? null}
          nota={acao.docsNota}
          done={!!acao.docsEnviadosAt}
          onToggle={() => patch({ docsEnviados: !acao.docsEnviadosAt })}
          onNotaChange={(v) => patch({ docsNota: v || null })}
          noteField="docsNota"
        />
        <StageBadge
          label="Deu entrada"
          date={acao.entradaAt}
          byName={acao.entradaBy?.name ?? null}
          nota={acao.entradaNota}
          done={!!acao.entradaAt}
          onToggle={() => patch({ entrada: !acao.entradaAt })}
          onNotaChange={(v) => patch({ entradaNota: v || null })}
          noteField="entradaNota"
        />
        <StageBadge
          label="Sentença / resultado"
          date={acao.sentencaAt}
          byName={acao.sentencaBy?.name ?? null}
          nota={acao.sentencaNota}
          done={!!acao.sentencaAt}
          onToggle={() => patch({ sentenca: !acao.sentencaAt })}
          onNotaChange={(v) => patch({ sentencaNota: v || null })}
          noteField="sentencaNota"
          extra={
            acao.sentencaAt ? (
              <div className="mt-1.5">
                <input
                  className="input py-1 text-xs"
                  defaultValue={acao.sentencaResultado ?? ""}
                  placeholder="Resultado (ex: procedente, acordo...)"
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v !== (acao.sentencaResultado ?? "")) patch({ sentencaResultado: v || null });
                  }}
                />
              </div>
            ) : null
          }
        />
      </div>

      <p className="mt-2 text-right text-[10px] text-muted/60">
        Criado por {acao.createdBy.name} em {fmtDate(acao.createdAt)}
      </p>
    </div>
  );
}

export function ClientAcoesTab({ clientId }: { clientId: string }) {
  const [acoes, setAcoes] = useState<Acao[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/acoes?clientId=${clientId}`);
      if (res.ok) {
        const data = await res.json() as { acoes: Acao[] };
        setAcoes(data.acoes);
      }
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = useCallback(async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/acoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      if (res.ok) {
        const data = await res.json() as { acao: Acao };
        setAcoes((prev) => [data.acao, ...prev]);
      }
    } finally {
      setCreating(false);
    }
  }, [clientId]);

  const handleUpdate = useCallback(async (id: string, patch: Record<string, unknown>) => {
    const res = await fetch(`/api/acoes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const data = await res.json() as { acao: Acao };
      setAcoes((prev) => prev.map((a) => (a.id === id ? data.acao : a)));
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const res = await fetch(`/api/acoes/${id}`, { method: "DELETE" });
    if (res.ok) setAcoes((prev) => prev.filter((a) => a.id !== id));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Ações judiciais / administrativas
          {acoes.length > 0 && (
            <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
              {acoes.length}
            </span>
          )}
        </h3>
        <button
          type="button"
          disabled={creating}
          onClick={handleCreate}
          className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs"
        >
          <Icon name="plus" className="h-3.5 w-3.5" />
          Nova ação
        </button>
      </div>

      {acoes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center">
          <p className="text-sm text-muted">Nenhuma ação registrada.</p>
          <button type="button" onClick={handleCreate} disabled={creating} className="mt-3 text-xs text-primary underline underline-offset-2">
            Criar primeira ação
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {acoes.map((a) => (
            <AcaoCard key={a.id} acao={a} onUpdate={handleUpdate} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
