"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/components/SessionProvider";
import { Icon } from "@/components/ui/Icon";

type Acao = {
  id: string;
  numCNJ: string | null;
  valorCausa: number | null;
  advConfirmadoAt: string | null;
  docsEnviadosAt: string | null;
  entradaAt: string | null;
  sentencaAt: string | null;
  sentencaResultado: string | null;
  client: {
    id: string;
    name: string;
    cod: string | null;
    teseRef: { id: string; name: string; color: string | null } | null;
    status: string;
  };
};

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function StageDot({ done, date }: { done: boolean; date: string | null }) {
  if (!done) return <span className="text-muted/40">—</span>;
  return (
    <span className="flex flex-col items-center gap-0.5">
      <span className="h-2 w-2 rounded-full bg-emerald-500" />
      <span className="text-[10px] text-muted">{fmtDate(date)}</span>
    </span>
  );
}

const ALLOWED_ROLES = ["ADMIN", "ADV", "GERENTE"];

export default function AcoesPage() {
  const { user } = useSession();
  const [acoes, setAcoes] = useState<Acao[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (stageFilter) params.set("stage", stageFilter);
      const res = await fetch(`/api/acoes?${params}`);
      if (res.ok) {
        const data = await res.json() as { acoes: Acao[] };
        setAcoes(data.acoes);
      }
    } finally {
      setLoading(false);
    }
  }, [stageFilter]);

  useEffect(() => { load(); }, [load]);

  if (!user) return null;
  if (!ALLOWED_ROLES.includes(user.role)) {
    return (
      <div className="flex items-center justify-center py-24 text-muted">
        Sem permissão para acessar esta página.
      </div>
    );
  }

  const filtered = acoes.filter((a) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      a.client.name.toLowerCase().includes(q) ||
      (a.client.cod ?? "").toLowerCase().includes(q) ||
      (a.numCNJ ?? "").toLowerCase().includes(q) ||
      (a.client.teseRef?.name ?? "").toLowerCase().includes(q)
    );
  });

  const stats = {
    total: acoes.length,
    adv: acoes.filter((a) => a.advConfirmadoAt).length,
    docs: acoes.filter((a) => a.docsEnviadosAt).length,
    entrada: acoes.filter((a) => a.entradaAt).length,
    sentenca: acoes.filter((a) => a.sentencaAt).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Ações</h1>
          <p className="text-sm text-muted">Processos judiciais e administrativos dos clientes</p>
        </div>
      </div>

      {/* Stats */}
      {!loading && acoes.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "ADV confirmou", value: stats.adv, color: "text-sky-500", bg: "bg-sky-500/10" },
            { label: "Docs enviados", value: stats.docs, color: "text-amber-500", bg: "bg-amber-500/10" },
            { label: "Deu entrada", value: stats.entrada, color: "text-violet-500", bg: "bg-violet-500/10" },
            { label: "Sentença", value: stats.sentenca, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl border border-border p-4 ${s.bg}`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted">{s.label}</p>
              <p className="mt-0.5 text-[10px] text-muted/60">de {stats.total} ações</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Icon name="search" className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <input
            className="input pl-8 pr-3 py-1.5 text-sm w-56"
            placeholder="Buscar cliente ou CNJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input py-1.5 text-sm"
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
        >
          <option value="">Todas as etapas</option>
          <option value="adv">ADV confirmou</option>
          <option value="docs">Docs enviados</option>
          <option value="entrada">Deu entrada</option>
          <option value="sentenca">Sentença</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted">Nenhuma ação encontrada.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left">
                <th className="px-4 py-3 font-medium text-muted">Cliente</th>
                <th className="px-4 py-3 font-medium text-muted">CNJ</th>
                <th className="px-3 py-3 text-center font-medium text-muted">ADV</th>
                <th className="px-3 py-3 text-center font-medium text-muted">Docs</th>
                <th className="px-3 py-3 text-center font-medium text-muted">Entrada</th>
                <th className="px-3 py-3 text-center font-medium text-muted">Sentença</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((a) => (
                <tr key={a.id} className="group bg-surface-elevated transition-colors hover:bg-surface">
                  <td className="px-4 py-3">
                    <Link
                      href={`/clients/${a.client.id}?tab=acoes`}
                      className="block hover:underline"
                    >
                      <span className="font-medium text-foreground">{a.client.name}</span>
                      {a.client.cod && (
                        <span className="ml-2 text-xs text-muted">#{a.client.cod}</span>
                      )}
                    </Link>
                    {a.client.teseRef && (
                      <span
                        className="mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium"
                        style={{
                          background: a.client.teseRef.color ? `${a.client.teseRef.color}22` : undefined,
                          color: a.client.teseRef.color ?? undefined,
                        }}
                      >
                        {a.client.teseRef.name}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {a.numCNJ ? (
                      <span className="font-mono text-xs text-primary">{a.numCNJ}</span>
                    ) : (
                      <span className="text-xs text-muted/40">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <StageDot done={!!a.advConfirmadoAt} date={a.advConfirmadoAt} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <StageDot done={!!a.docsEnviadosAt} date={a.docsEnviadosAt} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <StageDot done={!!a.entradaAt} date={a.entradaAt} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    {a.sentencaAt ? (
                      <span className="flex flex-col items-center gap-0.5">
                        <span className="h-2 w-2 rounded-full bg-violet-500" />
                        <span className="text-[10px] text-muted">{fmtDate(a.sentencaAt)}</span>
                        {a.sentencaResultado && (
                          <span className="text-[10px] font-medium text-violet-500">{a.sentencaResultado}</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-muted/40">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-border px-4 py-2 text-xs text-muted">
            {filtered.length} ação{filtered.length !== 1 ? "ões" : ""}
          </div>
        </div>
      )}
    </div>
  );
}
