"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ClientsTable } from "@/components/ClientsTable";
import { useTeseFilter } from "@/components/TeseFilterProvider";
import { STATUS_OPTIONS } from "@/lib/client-fields";
import type { ClientStatus, ClientWorkflowStatus } from "@prisma/client";
import { WORKFLOW_OPTIONS } from "@/lib/client-fields";

type ClientRow = {
  id: string;
  name: string;
  cod: string | null;
  cpf: string | null;
  tese: string | null;
  status: ClientStatus;
  workflowStatus: ClientWorkflowStatus;
  createdAt: string;
  primaryPhone: string | null;
  categories: { id: string; name: string }[];
};

function DashboardContent() {
  const { activeTeseId, activeTese } = useTeseFilter();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [workflowFilter, setWorkflowFilter] = useState("");

  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (activeTeseId) params.set("teseId", activeTeseId);
      if (workflowFilter) params.set("workflowStatus", workflowFilter);
      const qs = params.toString() ? `?${params}` : "";
      const res = await fetch(`/api/clients${qs}`);
      const data = await res.json();
      if (res.ok) setClients(data.clients ?? []);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, workflowFilter, activeTeseId]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-wide">Painel de clientes</h1>
          <p className="mt-1 text-sm text-muted">
            {activeTese
              ? `Exibindo apenas: ${activeTese.name}`
              : "Exibindo todas as teses — selecione uma acima para focar"}
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
          <select
            className="industrial-input w-auto min-w-[200px]"
            value={workflowFilter}
            onChange={(e) => setWorkflowFilter(e.target.value)}
          >
            <option value="">Todas finalizações</option>
            {WORKFLOW_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <Link href="/clients/new" className="btn-primary">
            Cadastro manual
          </Link>
          <button type="button" className="btn-ghost" onClick={loadClients}>
            Atualizar
          </button>
        </div>
      </div>
      <ClientsTable clients={clients} loading={loading} />
    </>
  );
}

export default function DashboardPage() {
  return (
    <AppShell>
      <DashboardContent />
    </AppShell>
  );
}
