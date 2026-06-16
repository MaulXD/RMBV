"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "./ui/Icon";

type GoalRow = {
  id: string;
  monthKey: string;
  targetFinalizations: number;
  achieved: number;
  percent: number;
  assignee: { id: string; name: string; role: string } | null;
};

type Member = { id: string; name: string; role: string };

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function ReportsGoalsPanel({
  teamId,
  canManage,
  members,
}: {
  teamId: string;
  canManage: boolean;
  members: Member[];
}) {
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const [assigneeId, setAssigneeId] = useState("");
  const [target, setTarget] = useState("10");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/goals?teamId=${teamId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao carregar metas");
      setGoals(data.goals ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/reports/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          monthKey,
          assigneeId: assigneeId || null,
          targetFinalizations: Number(target),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao criar meta");
      setTarget("10");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setSaving(false);
    }
  }

  async function removeGoal(id: string) {
    if (!confirm("Remover esta meta?")) return;
    const res = await fetch(`/api/reports/goals/${id}`, { method: "DELETE" });
    if (res.ok) await load();
  }

  return (
    <section className="panel-solid space-y-4 p-5">
      <div>
        <h2 className="font-semibold text-foreground">Metas de finalização</h2>
        <p className="mt-1 text-sm text-muted">Acompanhamento mensal por equipe ou ADV</p>
      </div>

      {canManage && (
        <form onSubmit={(e) => void createGoal(e)} className="grid gap-3 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-muted">Mês</label>
            <input
              type="month"
              className="industrial-input"
              value={monthKey}
              onChange={(e) => setMonthKey(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Responsável</label>
            <select
              className="industrial-input"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
            >
              <option value="">Equipe inteira</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Meta (finalizações)</label>
            <input
              type="number"
              min={1}
              className="industrial-input"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn-primary w-full" disabled={saving}>
              <Icon name="plus" className="h-4 w-4" />
              Adicionar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-muted">Carregando metas...</p>
      ) : goals.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma meta cadastrada.</p>
      ) : (
        <ul className="space-y-3">
          {goals.map((goal) => {
            const pct = Math.min(goal.percent, 100);
            return (
              <li key={goal.id} className="rounded-[var(--radius-ui)] border border-border p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">
                      {goal.monthKey}
                      {goal.assignee ? ` · ${goal.assignee.name}` : " · Equipe"}
                    </p>
                    <p className="text-xs text-muted">
                      {goal.achieved} / {goal.targetFinalizations} finalizações ({goal.percent}%)
                    </p>
                  </div>
                  {canManage && (
                    <button
                      type="button"
                      className="btn-ghost px-2 py-1 text-xs text-red-600 dark:text-red-400"
                      onClick={() => void removeGoal(goal.id)}
                    >
                      Remover
                    </button>
                  )}
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-border">
                  <div
                    className={`h-full rounded-full transition-all ${
                      pct >= 100 ? "bg-emerald-500" : pct >= 60 ? "bg-primary" : "bg-amber-500"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {error && <p className="alert alert-error text-xs">{error}</p>}
    </section>
  );
}
