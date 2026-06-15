"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Role, PhoneCheckResult } from "@prisma/client";
import { AppShell } from "@/components/AppShell";
import { ClientProfileForm } from "@/components/ClientProfileForm";
import { ClientProfileView } from "@/components/ClientProfileView";
import { ClientDocuments } from "@/components/ClientDocuments";
import { ClientFinalizationPanel } from "@/components/ClientFinalizationPanel";
import { ClientProfileTabs } from "@/components/ClientProfileTabs";
import { ClientHistoryTimeline } from "@/components/ClientHistoryTimeline";
import { ClientPesquisaSectionConnected } from "@/components/ClientPesquisaSection";
import type { ClientProfileData } from "@/lib/client-fields";
import { canFinalizeClients } from "@/lib/roles";
import { latestPhoneChecksFromHistory, type ClientHistoryEntry } from "@/lib/client-history";

type Category = { id: string; name: string };

export default function ClientDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [client, setClient] = useState<ClientProfileData | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [latestPhoneChecks, setLatestPhoneChecks] = useState<
    Partial<Record<string, PhoneCheckResult>>
  >({});
  const loadClient = useCallback(async () => {
    const res = await fetch(`/api/clients/${id}`);
    const data = await res.json();
    if (res.ok) setClient(data.client);
  }, [id]);

  const loadHistoryMeta = useCallback(async () => {
    const res = await fetch(`/api/clients/${id}/history`);
    const data = await res.json();
    if (res.ok) {
      const entries = (data.entries ?? []) as ClientHistoryEntry[];
      setLatestPhoneChecks(latestPhoneChecksFromHistory(entries));
    }
  }, [id]);

  const refreshHistory = useCallback(() => {
    setHistoryRefreshKey((k) => k + 1);
    loadHistoryMeta();
  }, [loadHistoryMeta]);

  useEffect(() => {
    Promise.all([
      loadClient(),
      loadHistoryMeta(),
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
    ])
      .then(([, , catData, meData]) => {
        setCategories(catData.categories ?? []);
        setIsAdmin(meData.user?.role === "ADMIN");
        setUserRole(meData.user?.role ?? null);
      })
      .finally(() => setLoading(false));
  }, [loadClient, loadHistoryMeta]);

  if (loading) {
    return (
      <AppShell>
        <p className="text-sm text-muted">Carregando cliente...</p>
      </AppShell>
    );
  }

  if (!client) {
    return (
      <AppShell>
        <p className="text-sm text-muted">Cliente não encontrado.</p>
        <Link href="/dashboard" className="btn-ghost mt-4 inline-flex">
          Voltar
        </Link>
      </AppShell>
    );
  }

  const isFinalized = client.workflowStatus === "FINALIZADO";
  const canFinalize = userRole
    ? canFinalizeClients({
        id: "",
        email: "",
        name: "",
        role: userRole,
        teamId: null,
        teamName: null,
      })
    : false;
  const canRequest = client.workflowStatus === "EM_ANDAMENTO";

  const perfilContent = (
    <div className="flex flex-col gap-6">
      {editMode && !isFinalized ? (
        <ClientProfileForm
          key={client.updatedAt}
          client={client}
          categories={categories}
          onSaved={(updated) => {
            setClient(updated);
            refreshHistory();
          }}
          latestPhoneChecks={latestPhoneChecks}
          onPhoneCheckRecorded={refreshHistory}
          onHistoryRefresh={refreshHistory}
          phoneActionsDisabled={isFinalized}
        />
      ) : (
        <ClientProfileView
          client={client}
          latestPhoneChecks={latestPhoneChecks}
          onPhoneCheckRecorded={refreshHistory}
          phoneActionsDisabled={isFinalized}
        />
      )}
      <ClientDocuments clientId={client.id} isAdmin={isAdmin} />
    </div>
  );

  const pesquisaContent = (
    <ClientPesquisaSectionConnected
      client={client}
      disabled={isFinalized}
      latestPhoneChecks={latestPhoneChecks}
      onUpdated={setClient}
      onPhoneCheckRecorded={refreshHistory}
    />
  );

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/dashboard" className="text-xs text-muted hover:text-foreground">
            ← Voltar ao painel
          </Link>
          <h1 className="font-display mt-2 text-xl font-semibold tracking-wide">
            Perfil do cliente
          </h1>
        </div>
        {!isFinalized && (
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setEditMode((v) => !v)}
          >
            {editMode ? "Modo visualização" : "Editar perfil"}
          </button>
        )}
      </div>

      <div className="space-y-6">
        <ClientFinalizationPanel
          client={client}
          canFinalize={canFinalize}
          canRequest={canRequest}
          onUpdated={setClient}
        />

        <ClientProfileTabs
          perfil={perfilContent}
          pesquisa={pesquisaContent}
          historico={
            <section className="industrial-panel p-4">
              <h2 className="mb-4 text-xs font-semibold tracking-widest text-muted uppercase">
                Linha do tempo
              </h2>
              <ClientHistoryTimeline clientId={client.id} refreshKey={historyRefreshKey} />
            </section>
          }
        />
      </div>
    </AppShell>
  );
}
