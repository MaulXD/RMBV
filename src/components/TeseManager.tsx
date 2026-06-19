"use client";

import { useState } from "react";
import { useTeseFilter } from "./TeseFilterProvider";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ToastProvider";

export function TeseManager() {
  const confirm = useConfirm();
  const toast = useToast();
  const { teses, refreshTeses } = useTeseFilter();
  const PRESET_COLORS = [
    "#6366f1", "#8b5cf6", "#a855f7", "#ec4899",
    "#f43f5e", "#ef4444", "#f97316", "#f59e0b",
    "#eab308", "#22c55e", "#10b981", "#14b8a6",
    "#0ea5e9", "#3b82f6", "#64748b", "#78716c",
  ];

  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]!);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/teses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), color }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao criar tese");
      setName("");
      toast("Tese criada com sucesso.", "success");
      await refreshTeses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
      toast("Erro ao criar tese.", "error");
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

  return (
    <section id="teses" className="industrial-panel max-w-xl space-y-4 p-6">
      <h2 className="text-sm font-medium">Categorias de tese</h2>
      <p className="text-xs text-muted">
        Use os botões no topo do sistema para filtrar e trabalhar só na tese selecionada.
      </p>

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
            </span>
            <button type="button" className="btn-ghost text-xs" onClick={() => handleDelete(t.id)}>
              Excluir
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={handleCreate} className="space-y-3">
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
      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}
