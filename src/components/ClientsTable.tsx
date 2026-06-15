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
  selectable = false,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
}: {
  clients: ClientRow[];
  loading?: boolean;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
}) {
  if (loading) {
    return (
      <div className="industrial-panel p-8 text-center text-sm text-muted">
        Carregando clientes...
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="industrial-panel p-8 text-center text-sm text-muted">
        Nenhum cliente cadastrado.
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
          <tr className="border-b border-border bg-aco-100/80 dark:bg-grafite-800">
            {selectable && (
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border accent-primary"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  aria-label="Selecionar todos"
                />
              </th>
            )}
            <th className="px-4 py-3 font-medium text-muted">COD</th>
            <th className="px-4 py-3 font-medium text-muted">Tese</th>
            <th className="px-4 py-3 font-medium text-muted">Nome</th>
            <th className="px-4 py-3 font-medium text-muted">CPF</th>
            <th className="px-4 py-3 font-medium text-muted">Status</th>
            <th className="px-4 py-3 font-medium text-muted">Finalização</th>
            <th className="px-4 py-3 font-medium text-muted">Categorias</th>
            <th className="px-4 py-3 font-medium text-muted">Telefone</th>
            <th className="px-4 py-3 font-medium text-muted"></th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => {
            const selected = selectedIds?.has(client.id) ?? false;
            return (
              <tr
                key={client.id}
                className={`border-b border-border last:border-0 ${
                  selected ? "bg-primary/10" : ""
                }`}
              >
                {selectable && (
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-border accent-primary"
                      checked={selected}
                      onChange={() => onToggleSelect?.(client.id)}
                      aria-label={`Selecionar ${client.name}`}
                    />
                  </td>
                )}
                <td className="px-4 py-3 text-muted">{client.cod ?? "—"}</td>
                <td className="px-4 py-3 text-muted">{client.tese ?? "—"}</td>
                <td className="px-4 py-3 font-medium">{client.name}</td>
                <td className="px-4 py-3 text-muted">{client.cpf ?? "—"}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={client.status} />
                </td>
                <td className="px-4 py-3">
                  <WorkflowBadge status={client.workflowStatus} />
                </td>
                <td className="px-4 py-3">
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
                <td className="px-4 py-3 text-muted">{client.primaryPhone ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/clients/${client.id}`} className="btn-ghost text-xs">
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
