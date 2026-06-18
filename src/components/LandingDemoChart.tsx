const RESEARCH_USERS = [
  { name: "Ana Costa",    avg: 4.2, total: 84, color: "bg-primary" },
  { name: "Carla Mendes", avg: 3.8, total: 76, color: "bg-primary" },
  { name: "Bruno Lima",   avg: 2.9, total: 58, color: "bg-primary" },
  { name: "Diego Souza",  avg: 2.1, total: 42, color: "bg-primary" },
  { name: "Elisa Rocha",  avg: 1.7, total: 34, color: "bg-primary" },
] as const;

// 5 semanas × 5 dias úteis = 25 células (intensidade 0–4)
const RESEARCH_HEATMAP = [
  2,3,4,3,2,
  1,4,3,4,3,
  3,2,4,3,4,
  0,3,2,3,2,
  4,3,3,4,2,
] as const;

const RESEARCH_SUMMARY = { total: 294, workingDays: 20, avg: 14.7 } as const;

const MONTHLY = [
  { label: "Jan", created: 42, finalized: 28, localized: 35 },
  { label: "Fev", created: 38, finalized: 31, localized: 29 },
  { label: "Mar", created: 55, finalized: 44, localized: 41 },
  { label: "Abr", created: 47, finalized: 39, localized: 38 },
  { label: "Mai", created: 61, finalized: 52, localized: 48 },
  { label: "Jun", created: 53, finalized: 47, localized: 44 },
] as const;

const TEAM_PRODUCTION = [
  { name: "Ana Costa", role: "Gerente", finalized: 52, localized: 38, goal: 48 },
  { name: "Bruno Lima", role: "ADV", finalized: 41, localized: 31, goal: 40 },
  { name: "Carla Mendes", role: "Colaboradora", finalized: 36, localized: 44, goal: 35 },
  { name: "Diego Souza", role: "Colaborador", finalized: 29, localized: 22, goal: 30 },
  { name: "Elisa Rocha", role: "Colaboradora", finalized: 33, localized: 27, goal: 32 },
] as const;

const TESE_SPLIT = [
  { name: "Tese Previdenciária", clients: 124, color: "bg-primary/80" },
  { name: "Tese Trabalhista", clients: 89, color: "bg-emerald-500/80" },
  { name: "Tese Cível", clients: 67, color: "bg-amber-500/80" },
  { name: "Tese Urgente", clients: 31, color: "bg-violet-500/80" },
] as const;

function ChartBar({
  value,
  max,
  className,
  title,
}: {
  value: number;
  max: number;
  className: string;
  title: string;
}) {
  const height = value > 0 ? Math.max(8, Math.round((value / max) * 140)) : 4;
  return (
    <div
      className={`w-3 rounded-t-sm ${className} ${value === 0 ? "opacity-30" : ""}`}
      style={{ height }}
      title={title}
    />
  );
}

export function LandingDemoChart() {
  const maxMonthly = Math.max(
    1,
    ...MONTHLY.flatMap((p) => [p.created, p.finalized, p.localized])
  );
  const totalTese = TESE_SPLIT.reduce((acc, t) => acc + t.clients, 0);

  return (
    <section id="demonstracao" className="border-y border-border bg-surface-elevated/60">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="mb-2 inline-block rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-primary uppercase">
              Demonstração · dados fictícios
            </span>
            <h2 className="font-display text-2xl font-semibold sm:text-3xl">
              Painel de produção da equipe
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted">
              Exemplo de como relatórios e metas aparecem no RMBV — nomes, números e teses são
              apenas ilustrativos.
            </p>
          </div>
          <div className="panel-solid px-4 py-3 text-center">
            <p className="text-2xl font-bold text-primary">311</p>
            <p className="text-xs text-muted">clientes ativos (demo)</p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-5">
          <div className="panel-solid p-5 lg:col-span-3">
            <h3 className="font-semibold">Evolução mensal — Equipe Aurora</h3>
            <p className="mt-1 text-xs text-muted">Últimos 6 meses · escritório fictício</p>

            <div className="mt-4 flex flex-wrap gap-4 text-xs">
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
                Novos clientes
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                Finalizados
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
                Localizados
              </span>
            </div>

            <div className="mt-4 flex items-end gap-3" style={{ height: 200 }}>
              {MONTHLY.map((point) => (
                <div key={point.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <div className="flex h-[160px] w-full items-end justify-center gap-1">
                    <ChartBar
                      value={point.created}
                      max={maxMonthly}
                      className="bg-primary/80"
                      title={`Novos: ${point.created}`}
                    />
                    <ChartBar
                      value={point.finalized}
                      max={maxMonthly}
                      className="bg-emerald-500/80"
                      title={`Finalizados: ${point.finalized}`}
                    />
                    <ChartBar
                      value={point.localized}
                      max={maxMonthly}
                      className="bg-amber-500/80"
                      title={`Localizados: ${point.localized}`}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-muted uppercase">{point.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel-solid p-5 lg:col-span-2">
            <h3 className="font-semibold">Clientes por tese</h3>
            <p className="mt-1 text-xs text-muted">Distribuição fictícia</p>
            <ul className="mt-5 space-y-4">
              {TESE_SPLIT.map((tese) => {
                const pct = Math.round((tese.clients / totalTese) * 100);
                return (
                  <li key={tese.name}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="font-medium">{tese.name}</span>
                      <span className="text-muted">
                        {tese.clients} · {pct}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-border/40">
                      <div
                        className={`h-full rounded-full ${tese.color}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Research mini dashboard */}
        <div className="mt-5 grid gap-5 lg:grid-cols-5">
          <div className="panel-solid p-5 lg:col-span-3">
            <h3 className="font-semibold">Pesquisas por colaborador</h3>
            <p className="mt-1 text-xs text-muted">Média por dia útil · junho/2026</p>

            <div className="mt-5 space-y-3">
              {RESEARCH_USERS.map((u) => {
                const pct = (u.avg / RESEARCH_USERS[0].avg) * 100;
                return (
                  <div key={u.name} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 truncate text-sm font-medium">{u.name}</span>
                    <div className="flex-1 overflow-hidden rounded-full bg-border/40" style={{ height: 10 }}>
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-16 text-right text-xs">
                      <span className="font-semibold text-primary">{u.avg}/dia</span>
                    </span>
                    <span className="w-14 text-right text-xs text-muted">{u.total} total</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-4">
              {[
                { label: "Pesquisas no mês", value: RESEARCH_SUMMARY.total, color: "text-primary" },
                { label: "Dias úteis", value: RESEARCH_SUMMARY.workingDays, color: "text-foreground" },
                { label: "Média geral/dia", value: RESEARCH_SUMMARY.avg, color: "text-emerald-600 dark:text-emerald-400" },
              ].map((c) => (
                <div key={c.label} className="text-center">
                  <p className={`text-2xl font-extrabold ${c.color}`}>{c.value}</p>
                  <p className="mt-0.5 text-[10px] text-muted">{c.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="panel-solid p-5 lg:col-span-2">
            <h3 className="font-semibold">Atividade diária</h3>
            <p className="mt-1 text-xs text-muted">Dias úteis · heatmap da equipe</p>

            <div className="mt-4 flex items-center gap-1.5 text-[10px] text-muted">
              <span>Menos</span>
              {["bg-border/40","bg-primary/20","bg-primary/45","bg-primary/70","bg-primary"].map((c,i) => (
                <div key={i} className={`h-3 w-3 rounded-sm ${c}`} />
              ))}
              <span>Mais</span>
            </div>

            <div className="mt-3 grid grid-cols-5 gap-1.5">
              {(["Seg","Ter","Qua","Qui","Sex"] as const).map((d) => (
                <div key={d} className="text-center text-[9px] font-medium text-muted">{d}</div>
              ))}
              {RESEARCH_HEATMAP.map((intensity, i) => {
                const colors = ["bg-border/40","bg-primary/20","bg-primary/45","bg-primary/70","bg-primary"];
                return (
                  <div
                    key={i}
                    className={`aspect-square rounded-sm ${colors[intensity]}`}
                  />
                );
              })}
            </div>

            <div className="mt-5 space-y-2 border-t border-border pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">Top pesquisadores</p>
              {RESEARCH_USERS.slice(0, 3).map((u, i) => (
                <div key={u.name} className="flex items-center gap-2">
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    i === 0 ? "bg-amber-400/20 text-amber-700 dark:text-amber-300"
                    : i === 1 ? "bg-primary/15 text-primary"
                    : "bg-border/60 text-muted"
                  }`}>{i + 1}</span>
                  <span className="flex-1 truncate text-xs font-medium">{u.name}</span>
                  <span className="text-xs font-semibold text-primary">{u.avg}/dia</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="panel-solid mt-5 p-5">
          <h3 className="font-semibold">Produção por colaborador — junho/2026</h3>
          <p className="mt-1 text-xs text-muted">Finalizações vs meta (valores de exemplo)</p>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="pb-2 pr-4 font-medium">Nome</th>
                  <th className="pb-2 pr-4 font-medium">Função</th>
                  <th className="pb-2 pr-4 font-medium">Finalizados</th>
                  <th className="pb-2 pr-4 font-medium">Localizados</th>
                  <th className="pb-2 font-medium">Meta</th>
                </tr>
              </thead>
              <tbody>
                {TEAM_PRODUCTION.map((person) => {
                  const pct = Math.min(100, Math.round((person.finalized / person.goal) * 100));
                  const onTrack = person.finalized >= person.goal;
                  return (
                    <tr key={person.name} className="border-b border-border/50">
                      <td className="py-3 pr-4 font-medium">{person.name}</td>
                      <td className="py-3 pr-4 text-muted">{person.role}</td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-border/40">
                            <div
                              className={`h-full rounded-full ${onTrack ? "bg-emerald-500" : "bg-primary/70"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="tabular-nums">{person.finalized}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 tabular-nums text-muted">{person.localized}</td>
                      <td className="py-3 tabular-nums text-muted">{person.goal}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {TEAM_PRODUCTION.slice(0, 3).map((person, index) => (
              <div
                key={person.name}
                className="flex items-center gap-3 rounded-xl border border-border/60 bg-surface/50 px-3 py-2"
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    index === 0
                      ? "bg-amber-500/20 text-amber-800 dark:text-amber-200"
                      : "bg-primary/12 text-primary"
                  }`}
                >
                  {index + 1}º
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{person.name}</p>
                  <p className="text-xs text-muted">{person.finalized} finalizações</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
