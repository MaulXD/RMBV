"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useSession } from "@/components/SessionProvider";
import { Icon } from "@/components/ui/Icon";

type TicketDetail = {
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
  responses: {
    id: string;
    message: string;
    createdAt: string;
    user: { name: string; email: string };
  }[];
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

const statusOptions = [
  { value: "ABERTO", label: "Aberto" },
  { value: "EM_ANDAMENTO", label: "Em andamento" },
  { value: "RESOLVIDO", label: "Resolvido" },
  { value: "FECHADO", label: "Fechado" },
];

export default function TicketDetailPage() {
  const { user } = useSession();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const fetchTicket = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ti/tickets/${params.id}`);
      if (!res.ok) { setTicket(null); return; }
      const data = await res.json();
      setTicket(data.ticket);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => { void fetchTicket(); }, [fetchTicket]);

  async function handleSendResponse(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/ti/tickets/${params.id}/response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() }),
      });
      if (res.ok) {
        setMessage("");
        await fetchTicket();
      }
    } finally {
      setSending(false);
    }
  }

  async function handleStatusChange(newStatus: string) {
    await fetch(`/api/ti/tickets/${params.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    await fetchTicket();
  }

  async function handleAssign() {
    await fetch(`/api/ti/tickets/${params.id}/assign`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user?.id }),
    });
    await fetchTicket();
  }

  if (!user || (user.role !== "TI" && user.role !== "ADMIN")) return null;
  if (loading) return <div className="p-8 text-center text-sm text-muted">Carregando...</div>;
  if (!ticket) return <div className="p-8 text-center text-sm text-muted">Chamado não encontrado</div>;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        icon="messageSquare"
        title={`Chamado: ${ticket.name}`}
        subtitle={ticket.necessidade}
        actions={
          <Link href="/ti/chamados" className="btn-ghost px-3 py-1.5 text-xs">
            <Icon name="chevronLeft" className="h-3.5 w-3.5" />
            Voltar
          </Link>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-surface-elevated p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">Status</p>
          <p className={`mt-1 inline-block rounded-full px-3 py-0.5 text-sm font-medium ${statusColors[ticket.status] || ""}`}>
            {statusLabels[ticket.status] || ticket.status}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-elevated p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">Sala</p>
          <p className="mt-1 text-sm font-medium text-foreground">{ticket.sala}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-elevated p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">Responsável</p>
          <p className="mt-1 text-sm font-medium text-foreground">
            {ticket.assignedTo?.name ?? (
              <button type="button" onClick={handleAssign} className="text-primary hover:underline">
                Assumir chamado
              </button>
            )}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-elevated p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">Data</p>
          <p className="mt-1 text-sm font-medium text-foreground tabular-nums">
            {new Date(ticket.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-border bg-surface-elevated p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Gerenciar chamado</h3>
          <div className="flex gap-1.5">
            {statusOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleStatusChange(opt.value)}
                className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                  ticket.status === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {ticket.obs && (
          <div className="rounded-xl bg-surface-elevated/50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">Observação do solicitante</p>
            <p className="mt-1 text-sm text-foreground">{ticket.obs}</p>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-surface-elevated p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-foreground">
          Respostas
          {ticket.responses.length > 0 && (
            <span className="ml-1.5 text-muted">({ticket.responses.length})</span>
          )}
        </h3>

        {ticket.responses.length > 0 ? (
          <div className="mb-4 space-y-3">
            {ticket.responses.map((r) => (
              <div key={r.id} className="rounded-xl border border-border bg-surface-elevated/50 p-4">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">{r.user.name}</span>
                  <span className="text-[11px] text-muted tabular-nums">
                    {new Date(r.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-foreground">{r.message}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mb-4 text-sm text-muted">Nenhuma resposta ainda.</p>
        )}

        <form onSubmit={handleSendResponse}>
          <textarea
            className="industrial-input min-h-[80px] w-full"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Digite sua resposta..."
            required
          />
          <div className="mt-2 flex justify-end">
            <button type="submit" className="btn-primary text-sm" disabled={sending || !message.trim()}>
              {sending ? "Enviando..." : "Enviar resposta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
