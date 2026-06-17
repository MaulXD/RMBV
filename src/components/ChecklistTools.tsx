"use client";

import { useCallback, useEffect, useState } from "react";
import { canManageChecklistTemplate } from "@/lib/roles";
import type { Role } from "@prisma/client";

type ChecklistItem = {
  id: string;
  label: string;
  sortOrder: number;
  isDone: boolean;
  doneAt: string | null;
  doneBy: { id: string; name: string } | null;
};

export function ClientChecklistSection({
  clientId,
  disabled,
}: {
  clientId: string;
  disabled?: boolean;
}) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [teseName, setTeseName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/clients/${clientId}/checklist`);
    const data = await res.json();
    if (res.ok) {
      setItems(data.items ?? []);
      setTeseName(data.teseName ?? null);
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(itemId: string, isDone: boolean) {
    setSavingId(itemId);
    const res = await fetch(`/api/clients/${clientId}/checklist`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, isDone }),
    });
    const data = await res.json();
    if (res.ok) {
      setItems((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, ...data.item } : item))
      );
    }
    setSavingId(null);
  }

  if (loading) {
    return (
      <section className="panel-solid p-4">
        <p className="text-sm text-muted">Carregando checklist…</p>
      </section>
    );
  }

  if (!teseName) {
    return (
      <section className="panel-solid p-4">
        <h2 className="text-xs font-semibold tracking-widest text-muted uppercase">Checklist</h2>
        <p className="mt-2 text-sm text-muted">Cliente sem tese — checklist indisponível.</p>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="panel-solid p-4">
        <h2 className="text-xs font-semibold tracking-widest text-muted uppercase">Checklist</h2>
        <p className="mt-2 text-sm text-muted">
          Nenhum item configurado para a tese <strong>{teseName}</strong>. Configure em Ferramentas →
          Checklist por tese.
        </p>
      </section>
    );
  }

  const done = items.filter((i) => i.isDone).length;

  return (
    <section className="panel-solid p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-semibold tracking-widest text-muted uppercase">Checklist</h2>
        <span className="text-xs text-muted">
          {teseName} · {done}/{items.length}
        </span>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-start gap-3 rounded-[var(--radius-ui)] border border-border px-3 py-2"
          >
            <input
              type="checkbox"
              className="mt-1"
              checked={item.isDone}
              disabled={disabled || savingId === item.id}
              onChange={(e) => void toggle(item.id, e.target.checked)}
            />
            <div className="min-w-0 flex-1">
              <p className={`text-sm ${item.isDone ? "text-muted line-through" : ""}`}>
                {item.label}
              </p>
              {item.isDone && item.doneAt && (
                <p className="text-xs text-muted">
                  {item.doneBy?.name ?? "Equipe"} · {new Date(item.doneAt).toLocaleString("pt-BR")}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function TeseChecklistTool({ userRole }: { userRole: string }) {
  const canManage = canManageChecklistTemplate({ role: userRole as Role });
  const [teses, setTeses] = useState<{ id: string; name: string }[]>([]);
  const [teseId, setTeseId] = useState("");
  const [items, setItems] = useState<{ id: string; label: string; sortOrder: number }[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/teses")
      .then((r) => r.json())
      .then((d) => setTeses(d.teses ?? []));
  }, []);

  useEffect(() => {
    if (!teseId) {
      setItems([]);
      return;
    }
    setLoading(true);
    fetch(`/api/teses/${teseId}/checklist`)
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .finally(() => setLoading(false));
  }, [teseId]);

  async function addItem() {
    if (!teseId || !newLabel.trim()) return;
    setError(null);
    const res = await fetch(`/api/teses/${teseId}/checklist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: newLabel.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Falha ao adicionar");
      return;
    }
    setItems((prev) => [...prev, data.item]);
    setNewLabel("");
  }

  async function removeItem(itemId: string) {
    const res = await fetch(`/api/teses/${teseId}/checklist/${itemId}`, { method: "DELETE" });
    if (res.ok) setItems((prev) => prev.filter((i) => i.id !== itemId));
  }

  return (
    <div className="space-y-6">
      <section className="panel-solid space-y-4 p-5">
        <div>
          <h2 className="font-semibold">Checklist por tese</h2>
          <p className="mt-1 text-sm text-muted">
            Defina itens obrigatórios por tese. A equipe marca o progresso no perfil do cliente.
          </p>
        </div>
        <div className="max-w-md">
          <label className="mb-1 block text-xs font-medium text-muted">Tese</label>
          <select
            className="industrial-input"
            value={teseId}
            onChange={(e) => setTeseId(e.target.value)}
          >
            <option value="">Selecione…</option>
            {teses.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      {teseId && (
        <section className="panel-solid space-y-3 p-5">
          <h3 className="text-sm font-semibold">Itens do checklist</h3>
          {loading ? (
            <p className="text-sm text-muted">Carregando…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted">Nenhum item ainda.</p>
          ) : (
            <ul className="space-y-2">
              {items.map((item, index) => (
                <li
                  key={item.id}
                  className="flex items-center gap-2 rounded-[var(--radius-ui)] border border-border px-3 py-2 text-sm"
                >
                  <span className="text-muted">{index + 1}.</span>
                  <span className="flex-1">{item.label}</span>
                  {canManage && (
                    <button
                      type="button"
                      className="btn-ghost px-2 py-1 text-xs text-red-600"
                      onClick={() => void removeItem(item.id)}
                    >
                      Remover
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {canManage ? (
            <div className="flex flex-wrap gap-2 pt-2">
              <input
                className="industrial-input min-w-[200px] flex-1"
                placeholder="Novo item do checklist"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void addItem();
                }}
              />
              <button type="button" className="btn-primary" onClick={() => void addItem()}>
                Adicionar
              </button>
            </div>
          ) : (
            <p className="text-xs text-muted">Somente gerente, ADV ou admin podem editar o modelo.</p>
          )}
          {error && <p className="alert alert-error">{error}</p>}
        </section>
      )}
    </div>
  );
}
