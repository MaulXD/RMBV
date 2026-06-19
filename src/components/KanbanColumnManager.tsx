"use client";

import { useEffect, useState } from "react";
import type { KanbanColumnItem } from "@/lib/kanban-columns";
import { Icon } from "./ui/Icon";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ToastProvider";

function ColumnRow({
  column,
  index,
  total,
  saving,
  onUpdate,
  onMove,
  onDelete,
}: {
  column: KanbanColumnItem;
  index: number;
  total: number;
  saving: boolean;
  onUpdate: (id: string, patch: Partial<KanbanColumnItem>) => Promise<void>;
  onMove: (index: number, direction: -1 | 1) => Promise<void>;
  onDelete: (column: KanbanColumnItem) => Promise<void>;
}) {
  const [name, setName] = useState(column.name);

  useEffect(() => {
    setName(column.name);
  }, [column.name]);

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-[var(--radius-ui)] border border-border bg-surface-elevated p-3">
      <input
        className="industrial-input min-w-[140px] flex-1"
        value={name}
        disabled={saving}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          const trimmed = name.trim();
          if (trimmed && trimmed !== column.name) {
            void onUpdate(column.id, { name: trimmed });
          } else {
            setName(column.name);
          }
        }}
      />
      <input
        type="color"
        className="h-9 w-10 cursor-pointer rounded border border-border bg-transparent"
        title="Cor da coluna"
        value={column.color ?? "#06b6d4"}
        disabled={saving}
        onChange={(e) => void onUpdate(column.id, { color: e.target.value })}
      />
      <label className="flex items-center gap-1.5 text-xs text-muted">
        <input
          type="checkbox"
          className="h-4 w-4 accent-primary"
          checked={column.isDone}
          disabled={saving}
          onChange={(e) => void onUpdate(column.id, { isDone: e.target.checked })}
        />
        Concluída
      </label>
      <div className="flex gap-1">
        <button
          type="button"
          className="btn-ghost px-2 py-1 text-xs"
          disabled={saving || index === 0}
          onClick={() => void onMove(index, -1)}
        >
          ←
        </button>
        <button
          type="button"
          className="btn-ghost px-2 py-1 text-xs"
          disabled={saving || index === total - 1}
          onClick={() => void onMove(index, 1)}
        >
          →
        </button>
        <button
          type="button"
          className="btn-ghost px-2 py-1 text-xs text-red-600 dark:text-red-400"
          disabled={saving || total <= 1}
          onClick={() => void onDelete(column)}
        >
          <Icon name="x" className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  );
}

export function KanbanColumnManager({
  teamId,
  columns,
  canManage,
  onUpdated,
}: {
  teamId: string;
  columns: KanbanColumnItem[];
  canManage: boolean;
  onUpdated: () => Promise<void>;
}) {
  const confirm = useConfirm();
  const toast = useToast();
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runAction(action: () => Promise<Response>, successMessage?: string) {
    setSaving(true);
    setError(null);
    try {
      const res = await action();
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha na operação");
      await onUpdated();
      if (successMessage) toast(successMessage, "success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
      toast("Erro na operação.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function updateColumn(id: string, patch: Partial<KanbanColumnItem>) {
    await runAction(
      () =>
        fetch(`/api/kanban/columns/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        }),
      "Coluna atualizada."
    );
  }

  async function addColumn() {
    if (!newName.trim()) return;
    await runAction(
      () =>
        fetch("/api/kanban/columns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teamId, name: newName.trim() }),
        }),
      "Coluna adicionada."
    );
    setNewName("");
  }

  async function moveColumn(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= columns.length) return;
    const order = [...columns];
    const [item] = order.splice(index, 1);
    order.splice(next, 0, item);
    await runAction(() =>
      fetch("/api/kanban/columns/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, columnIds: order.map((c) => c.id) }),
      })
    );
  }

  async function deleteColumn(column: KanbanColumnItem) {
    const others = columns.filter((c) => c.id !== column.id);
    if (others.length === 0) return;
    const moveTo = others[0].id;
    const ok = await confirm({
      message: `Excluir "${column.name}"? Tarefas irão para "${others[0].name}".`,
      danger: true,
    });
    if (!ok) return;
    await runAction(
      () =>
        fetch(`/api/kanban/columns/${column.id}?moveTasksTo=${moveTo}`, { method: "DELETE" }),
      "Coluna excluída."
    );
  }

  if (!canManage) {
    return (
      <div className="text-sm text-muted">Colunas: {columns.map((c) => c.name).join(" → ")}</div>
    );
  }

  return (
    <section className="panel-solid space-y-4 p-4">
      <div>
        <h3 className="text-xs font-semibold tracking-widest text-muted uppercase">
          Colunas do kanban
        </h3>
        <p className="mt-1 text-sm text-muted">
          Personalize as etapas do fluxo da equipe. Marque &quot;Concluída&quot; para colunas finais.
        </p>
      </div>

      <ul className="space-y-2">
        {columns.map((column, index) => (
          <ColumnRow
            key={column.id}
            column={column}
            index={index}
            total={columns.length}
            saving={saving}
            onUpdate={updateColumn}
            onMove={moveColumn}
            onDelete={deleteColumn}
          />
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        <input
          className="industrial-input min-w-[180px] flex-1"
          placeholder="Nova coluna..."
          value={newName}
          disabled={saving}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void addColumn();
          }}
        />
        <button
          type="button"
          className="btn-primary"
          disabled={saving || !newName.trim()}
          onClick={() => void addColumn()}
        >
          <Icon name="plus" className="h-4 w-4" />
          Adicionar
        </button>
      </div>

      {error && <p className="alert alert-error">{error}</p>}
    </section>
  );
}
