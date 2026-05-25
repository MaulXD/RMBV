"use client";

import Link from "next/link";
import type { ClientStatus } from "@prisma/client";
import { StatusBadge } from "./StatusBadge";

type ClientRow = {
  id: string;
  name: string;
  cod: string | null;
  cpf: string | null;
  status: ClientStatus;
  createdAt: string;
  primaryPhone: string | null;
  categories: { id: string; name: string }[];
};

export function ClientsTable({
  clients,
  loading,
}: {
  clients: ClientRow[];
  loading?: boolean;
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

  return (
    <div className="industrial-panel overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-aco-50 dark:bg-grafite-800">
            <th className="px-4 py-3 font-medium text-muted">COD</th>
            <th className="px-4 py-3 font-medium text-muted">Nome</th>
            <th className="px-4 py-3 font-medium text-muted">CPF</th>
            <th className="px-4 py-3 font-medium text-muted">Status</th>
            <th className="px-4 py-3 font-medium text-muted">Categorias</th>
            <th className="px-4 py-3 font-medium text-muted">Telefone</th>
            <th className="px-4 py-3 font-medium text-muted"></th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3 text-muted">{client.cod ?? "—"}</td>
              <td className="px-4 py-3 font-medium">{client.name}</td>
              <td className="px-4 py-3 text-muted">{client.cpf ?? "—"}</td>
              <td className="px-4 py-3">
                <StatusBadge status={client.status} />
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
