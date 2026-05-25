"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ClientsTable } from "@/components/ClientsTable";
import { STATUS_OPTIONS } from "@/lib/client-fields";
import type { ClientStatus } from "@prisma/client";

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

export default function DashboardPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const qs = statusFilter ? `?status=${statusFilter}` : "";
      const res = await fetch(`/api/clients${qs}`);
      const data = await res.json();
      if (res.ok) setClients(data.clients ?? []);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-wide">Painel de clientes</h1>
          <p className="mt-1 text-sm text-muted">
            Perfil completo conforme modelo CSV — clique em Abrir para ver e editar
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="industrial-input w-auto min-w-[180px]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Todos os status</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <button type="button" className="btn-ghost" onClick={loadClients}>
            Atualizar
          </button>
        </div>
      </div>
      <ClientsTable clients={clients} loading={loading} />
    </AppShell>
  );
}
