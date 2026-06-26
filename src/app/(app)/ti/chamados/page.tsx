"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useSession } from "@/components/SessionProvider";
import { Icon } from "@/components/ui/Icon";

type Ticket = {
  id: string;
  name: string;
  sala: string;
  necessidade: string;
  obs: string | null;
  email: string | null;
  status: string;
  createdAt: string;
  requester: { name: string; email: string } | null;
  assignedTo: { name: string; email: string } | null;
  _count: { responses: number };
};

const statusColors: Record<string, string> = {
  ABERTO: "bg-amber-500/15 text-amber-600",
  EM_ANDAMENTO: "bg-blue-500/15 text-blue-600",
  RESOLVIDO: "bg-green-500/15 text-green-600",
  FECHADO: "bg-neutral-500/15 text-neutral-600",
};

const statusLabels: Record<string, string> = {
  ABERTO: "Aberto",
  EM_ANDAMENTO: "Em andamento",
  RESOLVIDO: "Resolvido",
  FECHADO: "Fechado",
};

export default function TiChamadosPage() {
  const { user } = useSession();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState({ abertos: 0, emAndamento: 0, resolvidos: 0, fechados: 0 });
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveObs, setResolveObs] = useState("");
  const [resolveSaving, setResolveSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter) params.set("status", statusFilter);
      params.set("page", String(page));

      const res = await fetch(`/api/ti/tickets?${params}`);
      const data = await res.json();
      setTickets(data.tickets);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setStats(data.stats);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, page]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  if (!user || (user.role !== "TI" && user.role !== "ADMIN")) return null;

  async function handleResolve(ticketId: string) {
    setResolveSaving(true);
    try {
      const res = await fetch(`/api/ti/tickets/${ticketId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "RESOLVIDO", message: resolveObs.trim() || null }),
      });
      if (!res.ok) throw new Error("Erro ao resolver chamado");
      setResolvingId(null);
      setResolveObs("");
      await fetchData();
    } catch {
      alert("Erro ao resolver chamado");
    } finally {
      setResolveSaving(false);
    }
  }

  const statusTabs = [
    { value: "", label: "Todos", count: total },
    { value: "ABERTO", label: "Abertos", count: stats.abertos },
    { value: "EM_ANDAMENTO", label: "Em andamento", count: stats.emAndamento },
    { value: "RESOLVIDO", label: "Resolvidos", count: stats.resolvidos },
    { value: "FECHADO", label: "Fechados", count: stats.fechados },
  ];

  return (
    <div>
      <PageHeader icon="messageSquare" title="Chamados TI" subtitle="Atendimento de solicitações de suporte" />

      <div className="mb-6 flex flex-wrap gap-2">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => { setStatusFilter(tab.value); setPage(1); }}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === tab.value
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-surface-elevated text-muted hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {tab.label}
            <span className={`ml-1.5 tabular-nums ${statusFilter === tab.value ? "opacity-80" : "text-muted"}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <div className="mb-5 rounded-2xl border border-border bg-surface-elevated p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1 sm:max-w-xs">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-muted">Buscar</label>
            <input
              className="industrial-input w-full"
              placeholder="Nome, sala, necessidade..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          {search && (
            <button type="button" className="btn-ghost self-end px-3 py-2 text-xs" onClick={() => { setSearch(""); setPage(1); }}>
              Limpar
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl border border-border bg-surface-elevated p-5 shadow-sm">
              <div className="mb-3 h-4 w-1/3 rounded bg-border/50" />
              <div className="space-y-2">
                <div className="h-3 w-3/4 rounded bg-border/50" />
                <div className="h-3 w-1/2 rounded bg-border/50" />
                <div className="h-3 w-2/3 rounded bg-border/50" />
              </div>
            </div>
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <Icon name="messageSquare" className="mb-3 h-10 w-10 text-muted/40" />
          <p className="text-sm text-muted">Nenhum chamado encontrado</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tickets.map((t) => (
              <div
                key={t.id}
                className={`group relative rounded-2xl border bg-surface-elevated p-5 shadow-sm transition-all hover:shadow-md ${
                  t.status === "ABERTO"
                    ? "border-l-4 border-l-amber-500"
                    : t.status === "EM_ANDAMENTO"
                      ? "border-l-4 border-l-blue-500"
                      : t.status === "RESOLVIDO"
                        ? "border-l-4 border-l-green-500"
                        : "border-l-4 border-l-neutral-400"
                }`}
              >
                {/* Top row: status + date */}
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusColors[t.status] || ""}`}>
                    <Icon
                      name={t.status === "RESOLVIDO" ? "check" : t.status === "FECHADO" ? "x" : "circleDot"}
                      className="h-3 w-3"
                    />
                    {statusLabels[t.status] || t.status}
                  </span>
                  <span className="whitespace-nowrap text-[11px] tabular-nums text-muted">
                    {new Date(t.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                {/* Solicitante */}
                <div className="mb-1.5 flex items-center gap-2">
                  <User className="h-3.5 w-3.5 shrink-0 text-muted/60" />
                  <span className="truncate text-sm font-medium text-foreground">{t.name}</span>
                </div>

                {/* Sala */}
                <div className="mb-1.5 flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-muted/60" />
                  <span className="truncate text-xs text-muted">Sala {t.sala}</span>
                </div>

                {/* Necessidade */}
                <div className="mb-1.5 flex items-center gap-2">
                  <Wrench className="h-3.5 w-3.5 shrink-0 text-muted/60" />
                  <span className="truncate text-xs text-muted" title={t.necessidade}>{t.necessidade}</span>
                </div>

                {/* Responsável */}
                <div className="mb-4 flex items-center gap-2">
                  <Briefcase className="h-3.5 w-3.5 shrink-0 text-muted/60" />
                  <span className="truncate text-xs text-muted">{t.assignedTo?.name ?? "Não atribuído"}</span>
                </div>

                {/* Actions row */}
                <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                  <Link
                    href={`/ti/chamados/${t.id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80"
                  >
                    Ver detalhes
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                  {t.status !== "RESOLVIDO" && t.status !== "FECHADO" ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg bg-green-500/15 px-3 py-1.5 text-[11px] font-medium text-green-600 transition-colors hover:bg-green-500/25"
                      onClick={() => { setResolvingId(t.id); setResolveObs(""); }}
                    >
                      <Check className="h-3 w-3" />
                      Resolver
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between rounded-2xl border border-border bg-surface-elevated px-4 py-3 shadow-sm">
              <p className="text-xs text-muted">{total} chamado{(total !== 1 ? "s" : "")}</p>
              <div className="flex items-center gap-1">
                <button type="button" className="btn-ghost px-2 py-1 text-xs" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-2 text-xs tabular-nums text-muted">{page} / {totalPages}</span>
                <button type="button" className="btn-ghost px-2 py-1 text-xs" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
      {resolvingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setResolvingId(null)}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface-elevated p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-1 text-base font-semibold">Resolver chamado</h3>
            <p className="mb-4 text-sm text-muted">Adicione uma observação sobre a resolução (opcional).</p>
            <textarea
              className="industrial-input min-h-[100px] w-full"
              placeholder="Observação sobre a resolução..."
              value={resolveObs}
              onChange={(e) => setResolveObs(e.target.value)}
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setResolvingId(null)} disabled={resolveSaving}>
                Cancelar
              </button>
              <button type="button" className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50" onClick={() => handleResolve(resolvingId)} disabled={resolveSaving}>
                {resolveSaving ? "Salvando..." : "Confirmar resolução"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
