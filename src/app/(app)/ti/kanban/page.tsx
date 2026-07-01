"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
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
  priority: string;
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

const priorityConfig: Record<string, { label: string; class: string }> = {
  URGENTE: { label: "Urgente", class: "bg-red-500/15 text-red-600" },
  NORMAL:  { label: "Normal",  class: "bg-blue-500/10 text-blue-500" },
  BAIXA:   { label: "Baixa",   class: "bg-neutral-500/10 text-neutral-500" },
};

export default function TiKanbanPage() {
  const { user } = useSession();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);
  const dragTicketRef = useRef<Ticket | null>(null);

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

  async function handleDrop(newStatus: string) {
    const ticket = dragTicketRef.current;
    if (!ticket || ticket.status === newStatus) return;
    setDraggingId(null);
    setOverColumn(null);
    dragTicketRef.current = null;

    // Optimistic update
    setTickets((prev) =>
      prev.map((t) => t.id === ticket.id ? { ...t, status: newStatus } : t)
    );

    await fetch(`/api/ti/tickets/${ticket.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
  }

  return (
    <div>
      <PageHeader icon="kanban" title="Kanban TI" subtitle="Quadro de chamados — arraste para mover entre colunas" />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {grouped.map((col) => (
            <div
              key={col.key}
              className={`rounded-2xl border border-t-4 bg-surface-elevated shadow-sm transition-colors ${col.color} ${
                overColumn === col.key ? "border-primary/40 bg-primary/5" : "border-border"
              }`}
              onDragOver={(e) => { e.preventDefault(); setOverColumn(col.key); }}
              onDragLeave={() => setOverColumn(null)}
              onDrop={() => { void handleDrop(col.key); }}
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground">{col.label}</h3>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium tabular-nums text-primary">
                  {col.items.length}
                </span>
              </div>

              <div className="min-h-[60px] space-y-2 p-3">
                {col.items.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted">Nenhum chamado</p>
                ) : (
                  col.items.map((ticket) => {
                    const pri = priorityConfig[ticket.priority] ?? priorityConfig.NORMAL;
                    return (
                      <div
                        key={ticket.id}
                        draggable
                        onDragStart={() => {
                          setDraggingId(ticket.id);
                          dragTicketRef.current = ticket;
                        }}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setOverColumn(null);
                          dragTicketRef.current = null;
                        }}
                        className={`rounded-xl border border-border bg-surface p-3 transition-all select-none cursor-grab active:cursor-grabbing ${
                          draggingId === ticket.id ? "opacity-40 scale-95" : "hover:border-primary/30 hover:shadow-sm"
                        }`}
                      >
                        <div className="mb-1.5 flex items-start justify-between gap-2">
                          <p className="text-sm font-medium leading-snug text-foreground line-clamp-2">{ticket.necessidade}</p>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${pri.class}`}>
                            {pri.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted">{ticket.name} &middot; Sala {ticket.sala}</p>
                        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted">
                          <span className="tabular-nums">
                            {new Date(ticket.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                          </span>
                          {ticket.assignedTo && <span>&middot; {ticket.assignedTo.name}</span>}
                          {ticket._count.responses > 0 && (
                            <span className="ml-auto flex items-center gap-0.5">
                              <Icon name="messageSquare" className="h-3 w-3" />
                              {ticket._count.responses}
                            </span>
                          )}
                        </div>
                        <div className="mt-2">
                          <Link
                            href={`/ti/chamados/${ticket.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-[11px] text-primary hover:underline"
                          >
                            Ver detalhes
                          </Link>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
