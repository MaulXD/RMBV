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
  status: string;
  createdAt: string;
  assignedTo: { name: string } | null;
  _count: { responses: number };
};

const columns = [
  { key: "ABERTO", label: "Abertos", color: "border-t-amber-500" },
  { key: "EM_ANDAMENTO", label: "Em andamento", color: "border-t-blue-500" },
  { key: "RESOLVIDO", label: "Resolvidos", color: "border-t-green-500" },
  { key: "FECHADO", label: "Fechados", color: "border-t-neutral-500" },
];

const statusColors: Record<string, string> = {
  ABERTO: "bg-amber-500/15 text-amber-600",
  EM_ANDAMENTO: "bg-blue-500/15 text-blue-600",
  RESOLVIDO: "bg-green-500/15 text-green-600",
  FECHADO: "bg-neutral-500/15 text-neutral-600",
};

export default function TiKanbanPage() {
  const { user } = useSession();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ti/tickets?pageSize=200");
      const data = await res.json();
      setTickets(data.tickets || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchTickets(); }, [fetchTickets]);

  if (!user || (user.role !== "TI" && user.role !== "ADMIN" && user.role !== "SUPORTE")) return null;

  const grouped = columns.map((col) => ({
    ...col,
    items: tickets.filter((t) => t.status === col.key),
  }));

  async function handleDrag(ticketId: string, newStatus: string) {
    await fetch(`/api/ti/tickets/${ticketId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    await fetchTickets();
  }

  return (
    <div>
      <PageHeader icon="kanban" title="Kanban TI" subtitle="Quadro de chamados da equipe de suporte" />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {grouped.map((col) => (
            <div
              key={col.key}
              className={`rounded-2xl border border-border border-t-4 bg-surface-elevated shadow-sm ${col.color}`}
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground">{col.label}</h3>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium tabular-nums text-primary">
                  {col.items.length}
                </span>
              </div>

              <div className="space-y-2 p-3">
                {col.items.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted">Nenhum chamado</p>
                ) : (
                  col.items.map((ticket) => (
                    <Link
                      key={ticket.id}
                      href={`/ti/chamados/${ticket.id}`}
                      className="block rounded-xl border border-border bg-surface p-3 transition-colors hover:border-primary/30 hover:shadow-sm"
                    >
                      <div className="mb-1.5 flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-snug text-foreground line-clamp-2">{ticket.necessidade}</p>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[ticket.status] || ""}`}>
                          {col.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted">{ticket.name} &middot; Sala {ticket.sala}</p>
                      <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted">
                        <span className="tabular-nums">
                          {new Date(ticket.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                        </span>
                        {ticket.assignedTo && (
                          <span>&middot; {ticket.assignedTo.name}</span>
                        )}
                        {ticket._count.responses > 0 && (
                          <span className="ml-auto flex items-center gap-0.5">
                            <Icon name="messageSquare" className="h-3 w-3" />
                            {ticket._count.responses}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
