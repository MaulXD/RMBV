"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useSession } from "@/components/SessionProvider";
import { Icon } from "@/components/ui/Icon";

type StatusHistory = {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  changedByName: string | null;
  createdAt: string;
};

type TicketDetail = {
  id: string;
  name: string;
  sala: string;
  necessidade: string;
  obs: string | null;
  email: string | null;
  status: string;
  priority: string;
  createdAt: string;
  requester: { name: string; email: string } | null;
  assignedTo: { name: string; email: string } | null;
  responses: {
    id: string;
    message: string;
    createdAt: string;
    user: { name: string; email: string };
  }[];
  statusHistory: StatusHistory[];
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

const priorityConfig: Record<string, { label: string; class: string }> = {
  URGENTE: { label: "Urgente", class: "bg-red-500/15 text-red-600" },
  NORMAL:  { label: "Normal",  class: "bg-blue-500/10 text-blue-500" },
  BAIXA:   { label: "Baixa",   class: "bg-neutral-500/10 text-neutral-500" },
};

const priorityOptions = [
  { value: "URGENTE", label: "Urgente" },
  { value: "NORMAL",  label: "Normal" },
  { value: "BAIXA",   label: "Baixa" },
];

const quickReplies = [
  "Estamos verificando o problema e retornaremos em breve.",
  "Chamado resolvido. Equipamento já está funcionando normalmente.",
  "Aguardando resposta do solicitante.",
  "Técnico a caminho para atendimento presencial.",
  "Problema identificado. Aguardando peça/componente para reparo.",
  "Realizando instalação/configuração. Previsão de conclusão em breve.",
];

export default function TicketDetailPage() {
  const { user } = useSession();
  const params = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);

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

  async function handlePriorityChange(newPriority: string) {
    await fetch(`/api/ti/tickets/${params.id}/priority`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priority: newPriority }),
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

  if (!user || (user.role !== "TI" && user.role !== "ADMIN" && user.role !== "SUPORTE")) return null;
  if (loading) return <div className="p-8 text-center text-sm text-muted">Carregando...</div>;
  if (!ticket) return <div className="p-8 text-center text-sm text-muted">Chamado não encontrado</div>;

  const pri = priorityConfig[ticket.priority] ?? priorityConfig.NORMAL;

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
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">Prioridade</p>
          <p className={`mt-1 inline-block rounded-full px-3 py-0.5 text-sm font-semibold ${pri.class}`}>
            {pri.label}
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
      </div>

      {/* Status + priority management */}
      <div className="mb-6 rounded-2xl border border-border bg-surface-elevated p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Gerenciar chamado</h3>
        <div className="space-y-3">
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted">Status</p>
            <div className="flex flex-wrap gap-1.5">
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
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted">Prioridade</p>
            <div className="flex flex-wrap gap-1.5">
              {priorityOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handlePriorityChange(opt.value)}
                  className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                    ticket.priority === opt.value
                      ? opt.value === "URGENTE" ? "bg-red-500 text-white"
                        : opt.value === "BAIXA" ? "bg-neutral-500 text-white"
                        : "bg-primary text-primary-foreground"
                      : "border border-border text-muted hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {ticket.obs && (
          <div className="mt-4 rounded-xl bg-surface-elevated/50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">Observação do solicitante</p>
            <p className="mt-1 text-sm text-foreground">{ticket.obs}</p>
          </div>
        )}
      </div>

      {/* Responses */}
      <div className="mb-6 rounded-2xl border border-border bg-surface-elevated p-5 shadow-sm">
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

        {/* Quick replies */}
        <div className="mb-3">
          <button
            type="button"
            onClick={() => setShowQuickReplies(!showQuickReplies)}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors"
          >
            <Icon name="lightbulb" className="h-3.5 w-3.5" />
            Respostas rápidas
            <Icon name={showQuickReplies ? "chevronDown" : "chevronRight"} className="h-3 w-3" />
          </button>
          {showQuickReplies && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {quickReplies.map((reply) => (
                <button
                  key={reply}
                  type="button"
                  onClick={() => setMessage(reply)}
                  className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11px] text-muted transition-colors hover:border-primary/40 hover:text-foreground text-left"
                >
                  {reply.length > 55 ? reply.slice(0, 55) + "…" : reply}
                </button>
              ))}
            </div>
          )}
        </div>

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

      {/* Status history timeline */}
      {ticket.statusHistory.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface-elevated p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Histórico de status</h3>
          <ol className="relative border-l border-border pl-4 space-y-4">
            {ticket.statusHistory.map((h) => (
              <li key={h.id} className="relative">
                <div className="absolute -left-[21px] flex h-3.5 w-3.5 items-center justify-center rounded-full border border-border bg-surface-elevated">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-xs font-medium text-foreground">
                    {h.changedByName ?? "Sistema"}
                  </span>
                  <span className="text-[11px] text-muted">alterou para</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusColors[h.toStatus] || ""}`}>
                    {statusLabels[h.toStatus] || h.toStatus}
                  </span>
                  {h.fromStatus && (
                    <>
                      <span className="text-[11px] text-muted">de</span>
                      <span className="text-[11px] text-muted">
                        {statusLabels[h.fromStatus] || h.fromStatus}
                      </span>
                    </>
                  )}
                </div>
                <p className="text-[11px] text-muted tabular-nums">
                  {new Date(h.createdAt).toLocaleDateString("pt-BR", {
                    day: "2-digit", month: "2-digit", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
