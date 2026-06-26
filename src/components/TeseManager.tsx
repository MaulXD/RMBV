"use client";

import { useState } from "react";
import { useTeseFilter } from "./TeseFilterProvider";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ToastProvider";
import { Icon } from "./ui/Icon";

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#ec4899",
  "#f43f5e", "#ef4444", "#f97316", "#f59e0b",
  "#eab308", "#22c55e", "#10b981", "#14b8a6",
  "#0ea5e9", "#3b82f6", "#64748b", "#78716c",
];

export function TeseManager({
  teams,
}: {
  teams?: { id: string; name: string }[];
}) {
  const confirm = useConfirm();
  const toast = useToast();
  const { teses, refreshTeses } = useTeseFilter();

  const isAdmin = Array.isArray(teams);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]!);
  const [teamId, setTeamId] = useState(teams?.[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const teamMap = teams ? new Map(teams.map((t) => [t.id, t.name])) : new Map();

  // Merge state
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeSourceId, setMergeSourceId] = useState("");
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [merging, setMerging] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (isAdmin && !teamId) {
      setError("Selecione uma equipe.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, string> = { name: name.trim(), color };
      if (isAdmin && teamId) body.teamId = teamId;
      const res = await fetch("/api/teses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao criar tese");
      setName("");
      toast("Tese criada com sucesso.", "success");
      await refreshTeses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      message: "Excluir esta tese? Clientes ficarão sem tese vinculada.",
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/teses/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Não foi possível excluir");
      }
      toast("Tese excluída.", "success");
      await refreshTeses();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao excluir tese.", "error");
    }
  }

  async function handleMerge(e: React.FormEvent) {
    e.preventDefault();
    if (!mergeSourceId || !mergeTargetId || mergeSourceId === mergeTargetId) {
      toast("Selecione origem e destino diferentes.", "error");
      return;
    }
    const source = teses.find((t) => t.id === mergeSourceId);
    const target = teses.find((t) => t.id === mergeTargetId);
    const ok = await confirm({
      message: `Unir "${source?.name}" → "${target?.name}"? Todos os clientes da origem serão movidos para o destino e a tese origem será excluída.`,
      danger: true,
    });
    if (!ok) return;
    setMerging(true);
    try {
      const res = await fetch("/api/admin/teses/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceTeseId: mergeSourceId, targetTeseId: mergeTargetId, deleteSource: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao unir teses");
      toast(`${data.merged} cliente(s) movidos para "${target?.name}". Tese "${source?.name}" removida.`, "success");
      setMergeSourceId("");
      setMergeTargetId("");
      setMergeMode(false);
      await refreshTeses();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao unir teses.", "error");
    } finally {
      setMerging(false);
    }
  }

  return (
    <section id="teses" className="industrial-panel max-w-xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Categorias de tese</h2>
        <button
          type="button"
          className={`btn-ghost text-xs ${mergeMode ? "text-primary" : ""}`}
          onClick={() => setMergeMode((v) => !v)}
        >
          <Icon name="layers" className="h-3.5 w-3.5" />
          {mergeMode ? "Cancelar" : "Unir teses"}
        </button>
      </div>
      <p className="text-xs text-muted">
        Use os botões no topo do sistema para filtrar e trabalhar só na tese selecionada.
      </p>

      {/* Merge form */}
      {mergeMode && (
        <form onSubmit={handleMerge} className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
            Todos os clientes da tese origem serão movidos para o destino. A origem será excluída.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-muted">Origem (será excluída)</label>
              <select className="industrial-input w-full" value={mergeSourceId} onChange={(e) => setMergeSourceId(e.target.value)}>
                <option value="">Selecionar</option>
                {teses.filter((t) => t.id !== mergeTargetId).map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t._count?.clients ?? 0})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">Destino (ficará ativa)</label>
              <select className="industrial-input w-full" value={mergeTargetId} onChange={(e) => setMergeTargetId(e.target.value)}>
                <option value="">Selecionar</option>
                {teses.filter((t) => t.id !== mergeSourceId).map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t._count?.clients ?? 0})</option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="btn-danger text-sm"
            disabled={merging || !mergeSourceId || !mergeTargetId}
          >
            <Icon name="layers" className="h-4 w-4" />
            {merging ? "Unindo..." : "Confirmar união"}
          </button>
        </form>
      )}

      <ul className="space-y-2">
        {teses.map((t) => (
          <li
            key={t.id}
            className="flex items-center justify-between rounded-[var(--radius-ui)] border border-border px-3 py-2 text-sm"
          >
            <span className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-sm border border-border"
                style={{ backgroundColor: t.color ?? "#6b7585" }}
              />
              {t.name}
              <span className="text-xs text-muted">({t._count?.clients ?? 0})</span>
              {isAdmin && t.teamId && teamMap.has(t.teamId) && (
                <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted">{teamMap.get(t.teamId)}</span>
              )}
            </span>
            <button type="button" className="btn-ghost text-xs" onClick={() => handleDelete(t.id)}>
              Excluir
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={handleCreate} className="space-y-3">
        {isAdmin && teams && teams.length > 0 && (
          <select
            className="industrial-input"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
          >
            <option value="">Selecione a equipe</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
        <div className="flex flex-wrap gap-2">
          <input
            className="industrial-input min-w-[200px] flex-1"
            placeholder="Nome da nova tese"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button type="submit" className="btn-primary" disabled={loading}>
            Adicionar tese
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              title={c}
              className="h-6 w-6 rounded-md border-2 transition-transform hover:scale-110"
              style={{
                backgroundColor: c,
                borderColor: color === c ? "#ffffff" : "transparent",
                boxShadow: color === c ? `0 0 0 2px ${c}` : "none",
              }}
            />
          ))}
        </div>
      </form>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </section>
  );
}
