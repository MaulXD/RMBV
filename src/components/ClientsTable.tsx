"use client";

import Link from "next/link";
import type { ClientStatus, ClientWorkflowStatus } from "@prisma/client";
import { StatusBadge } from "./StatusBadge";
import { WorkflowBadge } from "./WorkflowBadge";

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
  categories: { id: string; name: string }[];
};

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
      <div className="industrial-panel overflow-x-auto">
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
              <th className="px-4 py-2" colSpan={3} />
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
                <td className="px-4 py-2">
                  <div className="skeleton h-4 w-12 rounded" />
                </td>
                <td className="px-4 py-2">
                  <div className="skeleton h-4 w-16 rounded" />
                </td>
                <td className="px-4 py-2">
                  <div className="skeleton h-4 w-40 rounded" />
                </td>
                <td className="px-4 py-2">
                  <div className="skeleton h-4 w-28 rounded" />
                </td>
                <td className="px-4 py-2">
                  <div className="skeleton h-5 w-20 rounded-full" />
                </td>
                <td className="px-4 py-2">
                  <div className="skeleton h-5 w-24 rounded-full" />
                </td>
                <td className="px-4 py-2" colSpan={3} />
              </tr>
            ))}
          </tbody>
        </table>
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
    <div className="industrial-panel overflow-x-auto">
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
              Categorias
            </th>
            <th className="px-4 py-2 text-left text-[11px] font-semibold tracking-widest text-muted uppercase">
              Telefone
            </th>
            <th className="px-4 py-2" />
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
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-1">
                    {client.categories.map((cat) => (
                      <span
                        key={cat.id}
                        className="rounded-[var(--radius-ui)] border border-border px-2 py-0.5 text-xs text-muted"
                      >
                        {cat.name}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-2 text-sm text-muted">{client.primaryPhone ?? "—"}</td>
                <td className="px-4 py-2 text-right">
                  <Link
                    href={`/clients/${client.id}`}
                    className="inline-flex rounded-lg border border-border px-3 py-1 text-xs text-muted opacity-0 transition-opacity hover:border-primary hover:bg-primary/[0.08] hover:text-primary group-hover:opacity-100"
                  >
                    Abrir
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
