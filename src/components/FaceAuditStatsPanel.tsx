"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "./ui/Icon";

type FailureEntry = {
  id: string;
  createdAt: string;
  teamId: string | null;
  metadata: Record<string, unknown> | null;
  actor: { id: string; name: string };
};

type Counts = Record<string, number>;

export function FaceAuditStatsPanel({ teamId }: { teamId?: string }) {
  const [failures, setFailures] = useState<FailureEntry[]>([]);
  const [counts, setCounts] = useState<Counts>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = teamId ? `?teamId=${teamId}` : "";
      const res = await fetch(`/api/admin/face-audit${qs}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { failures: FailureEntry[]; counts: Counts };
      setFailures(data.failures);
      setCounts(data.counts);
    } catch {
      setError("Falha ao carregar auditoria facial");
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => { void load(); }, [load]);

  const failRate =
    (counts.PONTO_OK ?? 0) + (counts.PONTO_FAIL ?? 0) > 0
      ? Math.round(((counts.PONTO_FAIL ?? 0) / ((counts.PONTO_OK ?? 0) + (counts.PONTO_FAIL ?? 0))) * 100)
      : 0;

  const repeatedFailers = Object.entries(
    failures.reduce<Record<string, { name: string; count: number }>>((acc, f) => {
      const k = f.actor.id;
      acc[k] = acc[k] ?? { name: f.actor.name, count: 0 };
      acc[k].count++;
      return acc;
    }, {})
  )
    .filter(([, v]) => v.count >= 3)
    .sort((a, b) => b[1].count - a[1].count);

  return (
    <div className="space-y-4">
      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Pontos OK" value={counts.PONTO_OK ?? 0} color="text-emerald-500" bg="bg-emerald-500/10" />
        <StatCard label="Falhas" value={counts.PONTO_FAIL ?? 0} color="text-red-500" bg="bg-red-500/10" />
        <StatCard label="Taxa de falha" value={`${failRate}%`} color={failRate > 10 ? "text-red-500" : "text-muted"} bg="bg-surface" />
        <StatCard label="Cadastros" value={(counts.ENROLL ?? 0) + (counts.RE_ENROLL ?? 0)} color="text-sky-500" bg="bg-sky-500/10" />
      </div>

      {/* Repeated failers */}
      {repeatedFailers.length > 0 && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
          <p className="mb-2 text-xs font-semibold text-red-500">
            Usuários com 3+ falhas recentes
          </p>
          <ul className="space-y-1">
            {repeatedFailers.map(([id, v]) => (
              <li key={id} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{v.name}</span>
                <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-500">
                  {v.count} falhas
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recent failures */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-2.5">
          <p className="text-xs font-semibold">Últimas falhas de reconhecimento</p>
          <button type="button" onClick={() => void load()} className="btn-ghost p-1">
            <Icon name="rotateCw" className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : error ? (
          <p className="p-4 text-sm text-red-500">{error}</p>
        ) : failures.length === 0 ? (
          <p className="p-4 text-sm text-muted">Nenhuma falha registrada.</p>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-surface text-muted">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Usuário</th>
                  <th className="px-4 py-2 text-left font-medium">Data/hora</th>
                  <th className="px-4 py-2 text-left font-medium">Confiança</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {failures.map((f) => {
                  const conf = typeof f.metadata?.confidence === "number"
                    ? `${Math.round(f.metadata.confidence * 100)}%`
                    : "—";
                  return (
                    <tr key={f.id} className="bg-surface-elevated hover:bg-surface">
                      <td className="px-4 py-2 font-medium">{f.actor.name}</td>
                      <td className="px-4 py-2 text-muted">
                        {new Date(f.createdAt).toLocaleString("pt-BR", {
                          day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-2 text-red-500">{conf}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color, bg }: { label: string; value: number | string; color: string; bg: string }) {
  return (
    <div className={`rounded-xl border border-border p-4 ${bg}`}>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
