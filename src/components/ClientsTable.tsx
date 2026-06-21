"use client";

import Link from "next/link";
import type { ClientStatus, ClientWorkflowStatus } from "@prisma/client";
import { StatusBadge } from "./StatusBadge";
import { WorkflowBadge } from "./WorkflowBadge";
import { Icon } from "./ui/Icon";

type ClientRow = {
  id: string;
  name: string;
  cod: string | null;
  tese: string | null;
  cpf: string | null;
  status: ClientStatus;
  workflowStatus: ClientWorkflowStatus;
  createdAt: string;
  primaryPhone: string | null;
  hasResearch: boolean;
  hasContacts: boolean;
  followUpAt?: string | null;
};

function FollowUpBadge({ followUpAt }: { followUpAt: string | null | undefined }) {
  if (!followUpAt) return null;
  const due = new Date(followUpAt);
  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const isOverdue = due < now && due.toDateString() !== now.toDateString();
  const isToday = due <= todayEnd && due >= new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const label = due.toLocaleDateString("pt-BR");
  if (isOverdue) {
    return (
      <span title={`Retorno vencido: ${label}`} className="inline-flex items-center gap-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
        <svg viewBox="0 0 16 16" className="h-3 w-3 shrink-0" fill="currentColor"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 3a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"/></svg>
        {label}
      </span>
    );
  }
  if (isToday) {
    return (
      <span title={`Retorno hoje: ${label}`} className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
        <svg viewBox="0 0 16 16" className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2v2m0 8v2M2 8h2m8 0h2M4.22 4.22l1.42 1.42m4.72 4.72 1.42 1.42M4.22 11.78l1.42-1.42m4.72-4.72 1.42-1.42"/><circle cx="8" cy="8" r="3"/></svg>
        Hoje
      </span>
    );
  }
  return (
    <span title={`Retorno agendado: ${label}`} className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
      <svg viewBox="0 0 16 16" className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="12" height="11" rx="1.5"/><path d="M5 1.5v3M11 1.5v3M2 7h12"/></svg>
      {label}
    </span>
  );
}

function ResearchBadge({ hasResearch, hasContacts }: { hasResearch: boolean; hasContacts: boolean }) {
  if (!hasResearch) {
    return (
      <span
        title="Sem pesquisa"
        className="inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-muted/30"
      >
        <svg viewBox="0 0 16 16" className="h-3 w-3 text-muted/40" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="8" cy="8" r="6" />
        </svg>
      </span>
    );
  }
  if (!hasContacts) {
    return (
      <span
        title="Pesquisa feita — sem contatos"
        className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30"
      >
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" fill="currentColor">
          <path d="M8 2a.75.75 0 0 1 .66.392l5.5 9.5A.75.75 0 0 1 13.5 13h-11a.75.75 0 0 1-.66-1.108l5.5-9.5A.75.75 0 0 1 8 2Zm0 4.5a.75.75 0 0 0-.75.75v2.5a.75.75 0 0 0 1.5 0v-2.5A.75.75 0 0 0 8 6.5Zm0 6a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" />
        </svg>
      </span>
    );
  }
  return (
    <span
      title="Pesquisa feita — com contatos"
      className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30"
    >
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.5 8.5 6 12l7.5-8" />
      </svg>
    </span>
  );
}

export function ClientsTable({
  clients,
  loading,
  emptyMessage = "Nenhum cliente cadastrado.",
  selectable = false,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
}: {
  clients: ClientRow[];
  loading?: boolean;
  emptyMessage?: string;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
}) {
  if (loading) {
    return (
      <div className="industrial-panel">
        {/* Mobile skeleton */}
        <div className="sm:hidden divide-y divide-border/60">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5">
              <div className="skeleton h-10 w-10 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="skeleton h-4 w-3/4 rounded" />
                <div className="skeleton h-3 w-1/2 rounded" />
              </div>
              <div className="skeleton h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
        {/* Desktop skeleton */}
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                {selectable && <th className="w-10 px-3 py-2" />}
                <th className="px-4 py-2 text-[11px] font-semibold tracking-widest text-muted uppercase">COD</th>
                <th className="px-4 py-2 text-[11px] font-semibold tracking-widest text-muted uppercase">Tese</th>
                <th className="px-4 py-2 text-[11px] font-semibold tracking-widest text-muted uppercase">Nome</th>
                <th className="px-4 py-2 text-[11px] font-semibold tracking-widest text-muted uppercase">CPF</th>
                <th className="px-4 py-2 text-[11px] font-semibold tracking-widest text-muted uppercase">Status</th>
                <th className="px-4 py-2 text-[11px] font-semibold tracking-widest text-muted uppercase">Finalização</th>
                <th className="px-4 py-2 text-[11px] font-semibold tracking-widest text-muted uppercase">Retorno</th>
                <th className="px-4 py-2 text-[11px] font-semibold tracking-widest text-muted uppercase">Pesquisa</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  {selectable && (
                    <td className="px-3 py-2">
                      <div className="skeleton h-4 w-4 rounded" />
                    </td>
                  )}
                  <td className="px-4 py-2"><div className="skeleton h-4 w-12 rounded" /></td>
                  <td className="px-4 py-2"><div className="skeleton h-4 w-16 rounded" /></td>
                  <td className="px-4 py-2"><div className="skeleton h-4 w-40 rounded" /></td>
                  <td className="px-4 py-2"><div className="skeleton h-4 w-28 rounded" /></td>
                  <td className="px-4 py-2"><div className="skeleton h-5 w-20 rounded-full" /></td>
                  <td className="px-4 py-2"><div className="skeleton h-5 w-24 rounded-full" /></td>
                  <td className="px-4 py-2" colSpan={2} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="industrial-panel p-8 text-center text-sm text-muted">
        {emptyMessage}
      </div>
    );
  }

  const allSelected =
    selectable &&
    selectedIds &&
    clients.length > 0 &&
    clients.every((c) => selectedIds.has(c.id));

  return (
    <div className="industrial-panel">
      {/* Mobile: card list */}
      <div className="sm:hidden divide-y divide-border/60">
        {clients.map((client) => {
          const selected = selectedIds?.has(client.id) ?? false;
          return (
            <Link
              key={client.id}
              href={`/clients/${client.id}`}
              className={`flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-primary/[0.06] hover:bg-primary/[0.03] ${selected ? "bg-primary/10" : ""}`}
            >
              {selectable && (
                <input
                  type="checkbox"
                  className="h-4 w-4 shrink-0 rounded border-border accent-primary"
                  checked={selected}
                  onChange={(e) => { e.stopPropagation(); onToggleSelect?.(client.id); }}
                  onClick={(e) => e.stopPropagation()}
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold text-sm text-foreground">{client.name}</span>
                  <StatusBadge status={client.status} />
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                  {client.cod && <span>#{client.cod}</span>}
                  {client.cod && client.tese && <span>·</span>}
                  {client.tese && <span className="truncate max-w-[120px]">{client.tese}</span>}
                  {client.primaryPhone && (
                    <>
                      {(client.cod || client.tese) && <span>·</span>}
                      <span>{client.primaryPhone}</span>
                    </>
                  )}
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <WorkflowBadge status={client.workflowStatus} />
                  {client.followUpAt && <FollowUpBadge followUpAt={client.followUpAt} />}
                  <span className="ml-auto shrink-0">
                    <ResearchBadge hasResearch={client.hasResearch} hasContacts={client.hasContacts} />
                  </span>
                </div>
              </div>
              <Icon name="chevronRight" className="h-4 w-4 shrink-0 text-muted/40" />
            </Link>
          );
        })}
      </div>

      {/* Desktop: table */}
      <div className="hidden sm:block overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-elevated/50">
            {selectable && (
              <th className="w-10 px-3 py-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border accent-primary"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  aria-label="Selecionar todos"
                />
              </th>
            )}
            <th className="px-4 py-2 text-left text-[11px] font-semibold tracking-widest text-muted uppercase">
              COD
            </th>
            <th className="px-4 py-2 text-left text-[11px] font-semibold tracking-widest text-muted uppercase">
              Tese
            </th>
            <th className="px-4 py-2 text-left text-[11px] font-semibold tracking-widest text-muted uppercase">
              Nome
            </th>
            <th className="px-4 py-2 text-left text-[11px] font-semibold tracking-widest text-muted uppercase">
              CPF
            </th>
            <th className="px-4 py-2 text-left text-[11px] font-semibold tracking-widest text-muted uppercase">
              Status
            </th>
            <th className="px-4 py-2 text-left text-[11px] font-semibold tracking-widest text-muted uppercase">
              Finalização
            </th>
            <th className="px-4 py-2 text-left text-[11px] font-semibold tracking-widest text-muted uppercase">
              Telefone
            </th>
            <th className="px-4 py-2 text-left text-[11px] font-semibold tracking-widest text-muted uppercase">
              Retorno
            </th>
            <th className="px-4 py-2 text-center text-[11px] font-semibold tracking-widest text-muted uppercase">
              Pesquisa
            </th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => {
            const selected = selectedIds?.has(client.id) ?? false;
            return (
              <tr
                key={client.id}
                className={`group border-b border-border transition-colors last:border-0 hover:bg-primary/[0.03] ${
                  selected ? "bg-primary/10" : ""
                }`}
              >
                {selectable && (
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-border accent-primary"
                      checked={selected}
                      onChange={() => onToggleSelect?.(client.id)}
                      aria-label={`Selecionar ${client.name}`}
                    />
                  </td>
                )}
                <td className="px-4 py-2 text-sm text-muted">{client.cod ?? "—"}</td>
                <td className="px-4 py-2 text-sm text-muted">{client.tese ?? "—"}</td>
                <td className="px-4 py-2 text-sm font-semibold text-foreground">
                  <Link
                    href={`/clients/${client.id}`}
                    className="hover:text-primary hover:underline underline-offset-2 transition-colors"
                  >
                    {client.name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-sm text-muted">{client.cpf ?? "—"}</td>
                <td className="px-4 py-2">
                  <StatusBadge status={client.status} />
                </td>
                <td className="px-4 py-2">
                  <WorkflowBadge status={client.workflowStatus} />
                </td>
                <td className="px-4 py-2 text-sm text-muted">{client.primaryPhone ?? "—"}</td>
                <td className="px-4 py-2">
                  <FollowUpBadge followUpAt={client.followUpAt} />
                </td>
                <td className="px-4 py-2 text-center">
                  <ResearchBadge hasResearch={client.hasResearch} hasContacts={client.hasContacts} />
                </td>
                <td className="px-2 py-2 text-right opacity-0 transition-opacity group-hover:opacity-100">
                  <Link
                    href={`/clients/${client.id}`}
                    className="btn-icon"
                    title="Editar cliente"
                  >
                    <Icon name="clipboardPen" className="h-3.5 w-3.5" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}
