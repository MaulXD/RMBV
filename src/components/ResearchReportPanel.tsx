"use client";

import { useEffect, useRef, useState } from "react";

function useCountUp(target: number, enabled: boolean, duration = 900): number {
  const [val, setVal] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    if (!enabled) { setVal(0); return; }
    const t0 = performance.now();
    function tick(now: number) {
      const p = Math.min((now - t0) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(e * target));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    }
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, enabled, duration]);
  return val;
}

function useCountUpFloat(target: number, enabled: boolean, decimals = 1, duration = 900): string {
  const [val, setVal] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    if (!enabled) { setVal(0); return; }
    const t0 = performance.now();
    function tick(now: number) {
      const p = Math.min((now - t0) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(e * target);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    }
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, enabled, duration]);
  return val.toFixed(decimals);
}

type ResearchUser = {
  id: string;
  name: string;
  total: number;
  avgPerDay: number;
  byDay: Record<string, number>;
};

type ResearchData = {
  period: { start: string; end: string };
  workingDays: number;
  totalPesquisas: number;
  avgPerDay: number;
  users: ResearchUser[];
  timeline: { date: string; count: number; isWorkingDay: boolean }[];
};

function UserBar({
  user,
  maxAvg,
  animated,
}: {
  user: ResearchUser;
  maxAvg: number;
  animated: boolean;
}) {
  const pct = maxAvg > 0 ? (user.avgPerDay / maxAvg) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 shrink-0 truncate text-sm font-medium text-foreground">{user.name}</span>
      <div className="flex-1 overflow-hidden rounded-full bg-border" style={{ height: 10 }}>
        <div
          className="h-full rounded-full bg-primary"
          style={{
            width: animated ? `${pct}%` : "0%",
            transition: "width 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
      </div>
      <span className="w-10 text-right text-xs font-semibold text-primary">{user.avgPerDay}/dia</span>
      <span className="w-16 text-right text-xs text-muted">{user.total} total</span>
    </div>
  );
}

function MiniCalendar({ timeline }: { timeline: ResearchData["timeline"] }) {
  if (timeline.length === 0) return null;

  const maxCount = Math.max(...timeline.map((d) => d.count), 1);

  // Group by week rows for compact display
  const days = timeline.filter((d) => d.isWorkingDay);
  if (days.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {days.map((d) => {
        const intensity = d.count === 0 ? 0 : Math.ceil((d.count / maxCount) * 4);
        const colors = [
          "bg-border/50",
          "bg-primary/20",
          "bg-primary/40",
          "bg-primary/70",
          "bg-primary",
        ];
        const label = new Date(d.date + "T12:00:00").toLocaleDateString("pt-BR", {
          weekday: "short", day: "numeric", month: "short",
        });
        return (
          <div
            key={d.date}
            title={`${label}: ${d.count} pesquisa${d.count !== 1 ? "s" : ""}`}
            className={`h-4 w-4 rounded-sm ${colors[intensity]} cursor-default transition-colors`}
          />
        );
      })}
    </div>
  );
}

function SummaryCards({ data, animated }: { data: ResearchData; animated: boolean }) {
  const total = useCountUp(data.totalPesquisas, animated);
  const days = useCountUp(data.workingDays, animated);
  const avg = useCountUpFloat(data.avgPerDay, animated);

  const cards = [
    { label: "Total de pesquisas", value: String(total), color: "text-primary", border: "border-primary/30" },
    { label: "Dias úteis no período", value: String(days), color: "text-foreground", border: "border-border" },
    { label: "Média geral / dia útil", value: avg, color: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-300 dark:border-emerald-800" },
  ];
  return (
    <div
      className="grid grid-cols-3 gap-3 transition-all duration-500"
      style={{ opacity: animated ? 1 : 0, transform: animated ? "translateY(0)" : "translateY(12px)" }}
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

export function ResearchReportPanel({
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
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const todayStr = today.toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(todayStr);
  const [teamId, setTeamId] = useState(
    isAdmin ? (teams[0]?.id ?? "") : (userTeamId ?? "")
  );
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ResearchData | null>(null);
  const [animated, setAnimated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setAnimated(false);
      const t = setTimeout(() => setAnimated(true), 60);
      return () => clearTimeout(t);
    }
  }, [data]);

  async function load() {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ startDate, endDate });
    if (teamId) params.set("teamId", teamId);
    try {
      const res = await fetch(`/api/reports/research?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  }

  const maxAvg = data ? Math.max(...data.users.map((u) => u.avgPerDay), 0.01) : 1;

  return (
    <div className="space-y-6">
      {/* Config */}
      <section className="panel-solid space-y-4 p-5">
        <h2 className="text-sm font-semibold text-foreground">Relatório de pesquisa</h2>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-muted">Data inicial</label>
            <input
              type="date"
              className="industrial-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Data final</label>
            <input
              type="date"
              className="industrial-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          {isAdmin && teams.length > 0 && (
            <div>
              <label className="mb-1 block text-xs text-muted">Equipe</label>
              <select
                className="industrial-input"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
              >
                <option value="">Todas</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            type="button"
            className="btn-primary"
            onClick={() => void load()}
            disabled={loading}
          >
            {loading ? "Carregando..." : "Gerar relatório"}
          </button>
        </div>

        <p className="text-[11px] text-muted">
          Conta apenas dias úteis (segunda a sexta), excluindo feriados nacionais + Carnaval.
        </p>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </section>

      {data && (
        <>
          {/* Summary cards */}
          <SummaryCards data={data} animated={animated} />

          {data.users.length === 0 ? (
            <section className="panel-solid p-6 text-center text-sm text-muted">
              Nenhuma pesquisa registrada neste período.
              <br />
              <span className="text-xs">
                As pesquisas só são contabilizadas a partir de quando o campo for salvo com esta versão do sistema.
              </span>
            </section>
          ) : (
            <>
              {/* Per user bars */}
              <section
                className="panel-solid p-5 transition-all duration-500"
                style={{ opacity: animated ? 1 : 0, transform: animated ? "translateY(0)" : "translateY(10px)" }}
              >
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted">
                  Média por colaborador (pesquisas / dia útil)
                </h3>
                <div className="space-y-3">
                  {data.users.map((u) => (
                    <UserBar key={u.id} user={u} maxAvg={maxAvg} animated={animated} />
                  ))}
                </div>
              </section>

              {/* Heatmap */}
              <section className="panel-solid p-5">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">
                  Atividade diária
                </h3>
                <div className="mb-2 flex items-center gap-2 text-[10px] text-muted">
                  <span>Menos</span>
                  {["bg-border/50", "bg-primary/20", "bg-primary/40", "bg-primary/70", "bg-primary"].map(
                    (c, i) => (
                      <div key={i} className={`h-3 w-3 rounded-sm ${c}`} />
                    )
                  )}
                  <span>Mais</span>
                </div>
                <MiniCalendar timeline={data.timeline} />
              </section>

              {/* Detail table */}
              <section className="panel-solid overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-elevated/50">
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-widest text-muted">
                        Colaborador
                      </th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-widest text-muted">
                        Total
                      </th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-widest text-muted">
                        Média / dia útil
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.users.map((u) => (
                      <tr key={u.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-2.5 font-medium">{u.name}</td>
                        <td className="px-4 py-2.5 text-right text-muted">{u.total}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-primary">
                          {u.avgPerDay}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
