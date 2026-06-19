"use client";

import { useEffect, useRef, useState } from "react";

function useCountUp(target: number, enabled: boolean, duration = 700): number {
  const [val, setVal] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    if (!enabled) { setVal(0); return; }
    const t0 = performance.now();
    function tick(now: number) {
      const p = Math.min((now - t0) / duration, 1);
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    }
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, enabled, duration]);
  return val;
}

type Collaborator = {
  id: string;
  name: string;
  role: string;
  totalCreated: number;
  totalFinalized: number;
  totalLocalized: number;
  totalPesquisas: number;
  totalLogins: number;
  finalizationRate: number;
  lastLogin: string | null;
};

const ROLE_LABELS: Record<string, string> = {
  ADV: "ADV", GERENTE: "Gerente", COLABORADOR: "Colaborador",
};

const ROLE_COLORS: Record<string, string> = {
  ADV: "text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-900/30",
  GERENTE: "text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30",
  COLABORADOR: "text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

function StatBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/60">
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${pct}%`, transition: "width 0.7s cubic-bezier(0.16,1,0.3,1)" }}
      />
    </div>
  );
}

function CollaboratorCard({
  c,
  maxCreated,
  maxFinalized,
  maxPesquisas,
  animated,
  onClick,
}: {
  c: Collaborator;
  maxCreated: number;
  maxFinalized: number;
  maxPesquisas: number;
  animated: boolean;
  onClick: () => void;
}) {
  const created = useCountUp(c.totalCreated, animated);
  const finalized = useCountUp(c.totalFinalized, animated);
  const localized = useCountUp(c.totalLocalized, animated);
  const pesquisas = useCountUp(c.totalPesquisas, animated);

  return (
    <button
      type="button"
      onClick={onClick}
      className="panel-solid w-full p-4 text-left transition-shadow hover:shadow-md"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-foreground">{c.name}</p>
          <span className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${ROLE_COLORS[c.role] ?? ROLE_COLORS.COLABORADOR}`}>
            {ROLE_LABELS[c.role] ?? c.role}
          </span>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted">Taxa de finalização</p>
          <p className={`text-lg font-bold tabular-nums ${c.finalizationRate >= 50 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
            {animated ? c.finalizationRate : 0}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <div>
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-muted">Criados</span>
            <span className="font-semibold tabular-nums text-primary">{created}</span>
          </div>
          <StatBar value={c.totalCreated} max={maxCreated} color="bg-primary/70" />
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-muted">Finalizados</span>
            <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{finalized}</span>
          </div>
          <StatBar value={c.totalFinalized} max={maxFinalized} color="bg-emerald-500/70" />
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-muted">Localizados</span>
            <span className="font-semibold tabular-nums text-amber-600 dark:text-amber-400">{localized}</span>
          </div>
          <StatBar value={c.totalLocalized} max={maxCreated} color="bg-amber-400/70" />
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-muted">Pesquisas</span>
            <span className="font-semibold tabular-nums text-foreground">{pesquisas}</span>
          </div>
          <StatBar value={c.totalPesquisas} max={maxPesquisas} color="bg-violet-400/70" />
        </div>
      </div>

      <p className="mt-3 text-[11px] text-muted">
        Último acesso: {formatDate(c.lastLogin)} · {c.totalLogins} login{c.totalLogins !== 1 ? "s" : ""} no período
      </p>
    </button>
  );
}

function CollaboratorDetail({
  c,
  onBack,
}: {
  c: Collaborator;
  onBack: () => void;
}) {
  const metrics = [
    { label: "Clientes criados", value: c.totalCreated, color: "text-primary", border: "border-primary/30" },
    { label: "Finalizados", value: c.totalFinalized, color: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-300 dark:border-emerald-800" },
    { label: "Localizados", value: c.totalLocalized, color: "text-amber-600 dark:text-amber-400", border: "border-amber-300 dark:border-amber-800" },
    { label: "Pesquisas", value: c.totalPesquisas, color: "text-violet-600 dark:text-violet-400", border: "border-violet-300 dark:border-violet-800" },
    { label: "Logins no período", value: c.totalLogins, color: "text-foreground", border: "border-border" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={onBack}>
          ← Voltar
        </button>
        <div>
          <h3 className="font-semibold text-foreground">{c.name}</h3>
          <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${ROLE_COLORS[c.role] ?? ROLE_COLORS.COLABORADOR}`}>
            {ROLE_LABELS[c.role] ?? c.role}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {metrics.map((m) => (
          <div key={m.label} className={`panel-solid border-l-2 p-4 ${m.border}`}>
            <p className="text-xs text-muted">{m.label}</p>
            <p className={`mt-1 text-3xl font-extrabold tabular-nums ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>

      <div className="panel-solid p-4">
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">Eficiência</h4>
        <div className="space-y-3">
          {[
            {
              label: "Taxa de finalização",
              pct: c.finalizationRate,
              color: c.finalizationRate >= 50 ? "bg-emerald-500" : "bg-amber-400",
              suffix: `${c.finalizationRate}%`,
            },
            {
              label: "Taxa de localização",
              pct: c.totalCreated > 0 ? Math.round((c.totalLocalized / c.totalCreated) * 100) : 0,
              color: "bg-amber-400",
              suffix: `${c.totalCreated > 0 ? Math.round((c.totalLocalized / c.totalCreated) * 100) : 0}%`,
            },
          ].map((row) => (
            <div key={row.label} className="flex items-center gap-3">
              <span className="w-40 shrink-0 text-xs text-muted">{row.label}</span>
              <div className="flex-1 overflow-hidden rounded-full bg-border" style={{ height: 10 }}>
                <div
                  className={`h-full rounded-full ${row.color}`}
                  style={{ width: `${row.pct}%`, transition: "width 0.7s cubic-bezier(0.16,1,0.3,1)" }}
                />
              </div>
              <span className="w-10 text-right text-xs font-semibold">{row.suffix}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel-solid p-4">
        <p className="text-xs text-muted">
          Último acesso: <span className="font-medium text-foreground">{formatDate(c.lastLogin)}</span>
        </p>
      </div>
    </div>
  );
}

function TeamSummary({ collaborators, animated }: { collaborators: Collaborator[]; animated: boolean }) {
  const totals = collaborators.reduce(
    (acc, c) => ({
      created: acc.created + c.totalCreated,
      finalized: acc.finalized + c.totalFinalized,
      localized: acc.localized + c.totalLocalized,
      pesquisas: acc.pesquisas + c.totalPesquisas,
    }),
    { created: 0, finalized: 0, localized: 0, pesquisas: 0 }
  );

  const teamRate = totals.created > 0 ? Math.round((totals.finalized / totals.created) * 100) : 0;
  const created = useCountUp(totals.created, animated);
  const finalized = useCountUp(totals.finalized, animated);
  const localized = useCountUp(totals.localized, animated);
  const pesquisas = useCountUp(totals.pesquisas, animated);

  const cards = [
    { label: "Total criados (equipe)", value: created, color: "text-primary", border: "border-primary/30" },
    { label: "Finalizados (equipe)", value: finalized, color: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-300 dark:border-emerald-800" },
    { label: "Localizados (equipe)", value: localized, color: "text-amber-600 dark:text-amber-400", border: "border-amber-300 dark:border-amber-800" },
    { label: "Pesquisas (equipe)", value: pesquisas, color: "text-violet-600 dark:text-violet-400", border: "border-violet-300 dark:border-violet-800" },
    {
      label: "Taxa de finalização",
      value: `${animated ? teamRate : 0}%`,
      color: teamRate >= 50 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400",
      border: "border-border",
    },
  ];

  return (
    <div
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 transition-all duration-500"
      style={{ opacity: animated ? 1 : 0, transform: animated ? "translateY(0)" : "translateY(10px)" }}
    >
      {cards.map((c) => (
        <div key={c.label} className={`panel-solid border-l-2 p-4 ${c.border}`}>
          <p className="text-xs text-muted">{c.label}</p>
          <p className={`mt-1 text-3xl font-extrabold tabular-nums ${c.color}`}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}

export function CollaboratorsReportPanel({
  teams,
  userRole,
  userTeamId,
}: {
  teams: { id: string; name: string }[];
  userRole: string;
  userTeamId: string | null;
}) {
  const isAdmin = userRole === "ADMIN";
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const todayStr = today.toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(todayStr);
  const [teamId, setTeamId] = useState(isAdmin ? (teams[0]?.id ?? "") : (userTeamId ?? ""));
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Collaborator[]>([]);
  const [animated, setAnimated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Collaborator | null>(null);

  useEffect(() => {
    if (data.length > 0) {
      setAnimated(false);
      const t = setTimeout(() => setAnimated(true), 60);
      return () => clearTimeout(t);
    }
  }, [data]);

  async function load() {
    setLoading(true);
    setError(null);
    setSelected(null);
    const params = new URLSearchParams({ startDate, endDate });
    if (teamId) params.set("teamId", teamId);
    try {
      const res = await fetch(`/api/reports/collaborators?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro");
      setData(json.collaborators ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  }

  const maxCreated = Math.max(...data.map((c) => c.totalCreated), 1);
  const maxFinalized = Math.max(...data.map((c) => c.totalFinalized), 1);
  const maxPesquisas = Math.max(...data.map((c) => c.totalPesquisas), 1);

  return (
    <div className="space-y-6">
      {/* Config */}
      <section className="panel-solid space-y-4 p-5">
        <h2 className="text-sm font-semibold text-foreground">Relatório por colaborador</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-muted">Data inicial</label>
            <input type="date" className="industrial-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Data final</label>
            <input type="date" className="industrial-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          {isAdmin && teams.length > 0 && (
            <div>
              <label className="mb-1 block text-xs text-muted">Equipe</label>
              <select className="industrial-input" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
                <option value="">Todas</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}
          <button type="button" className="btn-primary" onClick={() => void load()} disabled={loading}>
            {loading ? "Carregando..." : "Gerar relatório"}
          </button>
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </section>

      {data.length > 0 && !selected && (
        <>
          <TeamSummary collaborators={data} animated={animated} />

          <div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 transition-all duration-500"
            style={{ opacity: animated ? 1 : 0, transform: animated ? "translateY(0)" : "translateY(10px)", transitionDelay: "80ms" }}
          >
            {data.map((c) => (
              <CollaboratorCard
                key={c.id}
                c={c}
                maxCreated={maxCreated}
                maxFinalized={maxFinalized}
                maxPesquisas={maxPesquisas}
                animated={animated}
                onClick={() => setSelected(c)}
              />
            ))}
          </div>

          {/* Ranking table */}
          <section
            className="panel-solid overflow-x-auto transition-all duration-500"
            style={{ opacity: animated ? 1 : 0, transitionDelay: "160ms" }}
          >
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-elevated/50">
                  {["Colaborador", "Criados", "Finalizados", "Localizados", "Pesquisas", "Taxa", "Último acesso"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-widest text-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...data].sort((a, b) => b.totalFinalized - a.totalFinalized).map((c, i) => (
                  <tr
                    key={c.id}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-primary/[0.03]"
                    onClick={() => setSelected(c)}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold bg-border/60 text-muted">
                          {i + 1}
                        </span>
                        <span className="font-medium text-foreground">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-primary">{c.totalCreated}</td>
                    <td className="px-4 py-2.5 tabular-nums text-emerald-600 dark:text-emerald-400">{c.totalFinalized}</td>
                    <td className="px-4 py-2.5 tabular-nums text-amber-600 dark:text-amber-400">{c.totalLocalized}</td>
                    <td className="px-4 py-2.5 tabular-nums text-muted">{c.totalPesquisas}</td>
                    <td className="px-4 py-2.5 font-semibold tabular-nums">
                      <span className={c.finalizationRate >= 50 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                        {c.finalizationRate}%
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted">{formatDate(c.lastLogin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}

      {selected && (
        <CollaboratorDetail c={selected} onBack={() => setSelected(null)} />
      )}

      {data.length === 0 && !loading && !error && (
        <p className="text-sm text-muted">Configure o período e clique em &quot;Gerar relatório&quot;.</p>
      )}
    </div>
  );
}
