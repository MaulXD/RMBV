"use client";

import { useEffect, useRef, useState } from "react";

function useCountUp(target: number, enabled: boolean, duration = 800): number {
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

type MonthlyData = {
  period: { start: string; end: string };
  summary: { totalCreated: number; totalFinalized: number; totalLocalized: number };
  byStatus: { status: string; label: string; count: number }[];
  byMonth: { monthKey: string; label: string; created: number; finalized: number }[];
  byCollaborator: { name: string; created: number; finalized: number }[];
};

const CHART_OPTIONS = [
  { id: "summary", label: "Resumo geral (cards)" },
  { id: "status", label: "Distribuição por status" },
  { id: "month", label: "Evolução mensal" },
  { id: "collaborator", label: "Produção por colaborador" },
];

const STATUS_COLORS: Record<string, string> = {
  AGUARDANDO: "#94a3b8",
  LOCALIZADO: "#22c55e",
  SEM_SUCESSO: "#ef4444",
  TENTE_NOVAMENTE: "#f59e0b",
};

function HorizontalBar({
  label, value, max, color, animated = true,
}: {
  label: string; value: number; max: number; color: string; animated?: boolean;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-36 shrink-0 truncate text-xs text-muted">{label}</span>
      <div className="flex-1 overflow-hidden rounded-full bg-border" style={{ height: 10 }}>
        <div
          className="h-full rounded-full"
          style={{
            width: animated ? `${pct}%` : "0%",
            backgroundColor: color,
            transition: "width 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
      </div>
      <span className="w-8 text-right text-xs font-semibold text-foreground">{value}</span>
    </div>
  );
}

function MonthChart({
  data, animated = true,
}: {
  data: { monthKey?: string; label: string; created: number; finalized: number }[];
  animated?: boolean;
}) {
  if (data.length === 0) return <p className="text-xs text-muted">Sem dados mensais.</p>;
  const max = Math.max(...data.flatMap((d) => [d.created, d.finalized]), 1);
  return (
    <div className="flex items-end gap-1.5 pt-2" style={{ height: 120 }}>
      {data.map((d) => (
        <div key={d.monthKey} className="flex flex-1 flex-col items-center gap-0.5">
          <div className="flex w-full items-end gap-0.5" style={{ height: 90 }}>
            <div
              className="flex-1 rounded-t-sm bg-blue-500 opacity-80"
              style={{
                height: animated ? `${(d.created / max) * 90}px` : "0px",
                minHeight: 0,
                transition: "height 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              title={`Criados: ${d.created}`}
            />
            <div
              className="flex-1 rounded-t-sm bg-emerald-500 opacity-80"
              style={{
                height: animated ? `${(d.finalized / max) * 90}px` : "0px",
                minHeight: 0,
                transition: "height 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              title={`Finalizados: ${d.finalized}`}
            />
          </div>
          <span className="text-center text-[9px] text-muted leading-tight">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function MonthlySummaryCards({ data, animated }: { data: MonthlyData; animated: boolean }) {
  const created = useCountUp(data.summary.totalCreated, animated);
  const finalized = useCountUp(data.summary.totalFinalized, animated);
  const localized = useCountUp(data.summary.totalLocalized, animated);

  const cards = [
    { label: "Clientes criados", value: created, color: "text-primary", border: "border-primary/30" },
    { label: "Finalizados", value: finalized, color: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-300 dark:border-emerald-800" },
    { label: "Localizados", value: localized, color: "text-amber-600 dark:text-amber-400", border: "border-amber-300 dark:border-amber-800" },
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

export function MonthlyReportPanel({
  teams,
  teses,
  userRole,
  userTeamId,
}: {
  teams: { id: string; name: string }[];
  teses: { id: string; name: string }[];
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
  const [teseId, setTeseId] = useState("");
  const [charts, setCharts] = useState<string[]>(["summary", "status", "month", "collaborator"]);
  const [docMode, setDocMode] = useState<"none" | "list" | "preview">("list");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<MonthlyData | null>(null);
  const [animated, setAnimated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setAnimated(false);
      const t = setTimeout(() => setAnimated(true), 60);
      return () => clearTimeout(t);
    }
  }, [data]);

  function toggleChart(id: string) {
    setCharts((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  }

  async function loadPreview() {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ startDate, endDate });
    if (teamId) params.set("teamId", teamId);
    if (teseId) params.set("teseId", teseId);
    try {
      const res = await fetch(`/api/reports/monthly?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro ao carregar dados");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  }

  function pdfUrl() {
    const params = new URLSearchParams({ startDate, endDate, charts: charts.join(","), docMode });
    if (teamId) params.set("teamId", teamId);
    if (teseId) params.set("teseId", teseId);
    return `/api/reports/monthly-pdf?${params}`;
  }

  return (
    <div className="space-y-6">
      {/* Config panel */}
      <section className="panel-solid space-y-5 p-5">
        <h2 className="text-sm font-semibold text-foreground">Configurar relatório</h2>

        {/* Period */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
          {teses.length > 0 && (
            <div>
              <label className="mb-1 block text-xs text-muted">Tese</label>
              <select className="industrial-input" value={teseId} onChange={(e) => setTeseId(e.target.value)}>
                <option value="">Todas</option>
                {teses.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Charts */}
        <div>
          <p className="mb-2 text-xs font-medium text-muted">Gráficos no PDF</p>
          <div className="flex flex-wrap gap-2">
            {CHART_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggleChart(opt.id)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  charts.includes(opt.id)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted hover:border-primary/50"
                }`}
              >
                {charts.includes(opt.id) ? "✓ " : ""}{opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Doc mode */}
        <div>
          <p className="mb-2 text-xs font-medium text-muted">Documentos dos clientes no PDF</p>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "none", label: "Não incluir" },
              { id: "list", label: "Listar nomes e tags" },
              { id: "preview", label: "Preview de imagens" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setDocMode(opt.id as "none" | "list" | "preview")}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  docMode === opt.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted hover:border-primary/50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {docMode === "preview" && (
            <p className="mt-1.5 text-[11px] text-muted">Apenas imagens (JPG, PNG) serão incorporadas. PDFs aparecem somente na lista.</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button type="button" className="btn-ghost" onClick={() => void loadPreview()} disabled={loading}>
            {loading ? "Carregando..." : "Pré-visualizar"}
          </button>
          <a
            href={pdfUrl()}
            target="_blank"
            rel="noreferrer"
            className="btn-primary"
          >
            Gerar PDF
          </a>
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </section>

      {/* Preview */}
      {data && (
        <div className="space-y-5">
          {/* Summary cards */}
          {charts.includes("summary") && (
            <MonthlySummaryCards data={data} animated={animated} />
          )}

          {/* Status bars */}
          {charts.includes("status") && (
            <section
              className="panel-solid p-4 transition-all duration-500"
              style={{ opacity: animated ? 1 : 0, transform: animated ? "translateY(0)" : "translateY(10px)" }}
            >
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">Distribuição por status</h3>
              <div className="space-y-2">
                {data.byStatus.filter((s) => s.count > 0).map((s) => (
                  <HorizontalBar
                    key={s.status}
                    label={s.label}
                    value={s.count}
                    max={data.summary.totalCreated}
                    color={STATUS_COLORS[s.status] ?? "#94a3b8"}
                    animated={animated}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Month chart */}
          {charts.includes("month") && data.byMonth.length > 0 && (
            <section
              className="panel-solid p-4 transition-all duration-500"
              style={{ opacity: animated ? 1 : 0, transform: animated ? "translateY(0)" : "translateY(10px)", transitionDelay: "80ms" }}
            >
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted">Evolução mensal</h3>
              <div className="mb-2 flex gap-4 text-[10px] text-muted">
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-blue-500" />Criados</span>
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />Finalizados</span>
              </div>
              <MonthChart data={data.byMonth} animated={animated} />
            </section>
          )}

          {/* Collaborator bars */}
          {charts.includes("collaborator") && data.byCollaborator.length > 0 && (
            <section
              className="panel-solid p-4 transition-all duration-500"
              style={{ opacity: animated ? 1 : 0, transform: animated ? "translateY(0)" : "translateY(10px)", transitionDelay: "160ms" }}
            >
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">Produção por colaborador</h3>
              <div className="space-y-2">
                {data.byCollaborator.map((c) => (
                  <div key={c.name} className="space-y-1">
                    <HorizontalBar label={`${c.name} (criados)`} value={c.created} max={data.byCollaborator[0]?.created ?? 1} color="#3b82f6" animated={animated} />
                    {c.finalized > 0 && (
                      <HorizontalBar label={`${c.name} (fin.)`} value={c.finalized} max={data.byCollaborator[0]?.created ?? 1} color="#22c55e" animated={animated} />
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
