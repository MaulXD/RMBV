"use client";

type MonthPoint = {
  monthKey: string;
  label: string;
  created: number;
  finalized: number;
  localized: number;
};

export function ReportsTimelineChart({ timeline }: { timeline: MonthPoint[] }) {
  if (timeline.length === 0) return null;

  const max = Math.max(
    1,
    ...timeline.flatMap((p) => [p.created, p.finalized, p.localized])
  );

  return (
    <section className="panel-solid p-5">
      <div className="mb-4">
        <h2 className="font-semibold text-foreground">Desenvolvimento da equipe</h2>
        <p className="mt-1 text-sm text-muted">Últimos {timeline.length} meses</p>
      </div>

      <div className="mb-4 flex flex-wrap gap-4 text-xs">
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

      <div className="scrollbar-none overflow-x-auto pb-2">
        <div className="flex min-w-[640px] items-end gap-3" style={{ height: 220 }}>
          {timeline.map((point) => (
            <div key={point.monthKey} className="flex min-w-[52px] flex-1 flex-col items-center gap-2">
              <div className="flex h-[180px] w-full items-end justify-center gap-1">
                <Bar value={point.created} max={max} className="bg-primary/80" title={`Novos: ${point.created}`} />
                <Bar
                  value={point.finalized}
                  max={max}
                  className="bg-emerald-500/80"
                  title={`Finalizados: ${point.finalized}`}
                />
                <Bar
                  value={point.localized}
                  max={max}
                  className="bg-amber-500/80"
                  title={`Localizados: ${point.localized}`}
                />
              </div>
              <span className="text-[10px] font-medium text-muted uppercase">{point.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Bar({
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
  const height = value > 0 ? Math.max(8, Math.round((value / max) * 160)) : 4;
  return (
    <div
      className={`w-3 rounded-t-sm transition-all ${className} ${value === 0 ? "opacity-30" : ""}`}
      style={{ height }}
      title={title}
    />
  );
}
