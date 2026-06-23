"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import type { Role, PhoneCheckResult } from "@prisma/client";
import { useSession } from "@/components/SessionProvider";
import { ClientProfileForm } from "@/components/ClientProfileForm";
import { ClientProfileView } from "@/components/ClientProfileView";
import { ClientDocuments } from "@/components/ClientDocuments";
import { ClientFinalizationPanel } from "@/components/ClientFinalizationPanel";
import { ClientProfileTabs } from "@/components/ClientProfileTabs";
import { ClientHistoryTimeline } from "@/components/ClientHistoryTimeline";
import { ClientHistoryComposer } from "@/components/ClientHistoryComposer";
import { ClientDuplicateBanner } from "@/components/ClientDuplicateBanner";
import { ClientPesquisaSectionConnected } from "@/components/ClientPesquisaSection";
import { ClientExtractionReview } from "@/components/ClientExtractionReview";
import { ClientTasksSection } from "@/components/ClientTasksSection";
import { ClientUnifiedTimeline } from "@/components/ClientUnifiedTimeline";
import { ClientMobileQuickActions } from "@/components/ClientMobileQuickActions";
import { ClientChecklistSection } from "@/components/ChecklistTools";
import { ClientRelativesPanel } from "@/components/ClientRelativesPanel";
import { ClientAcoesTab } from "@/components/acoes/ClientAcoesTab";
import type { ClientProfileTab } from "@/components/ClientProfileTabs";
import type { ClientProfileData } from "@/lib/client-fields";
import { canFinalizeClients } from "@/lib/roles";
import { latestPhoneChecksFromHistory, type ClientHistoryEntry } from "@/lib/client-history";

type Category = { id: string; name: string };

export default function ClientDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const { user } = useSession();
  const isAdmin = user?.role === "ADMIN";
  const canSeeAcoes = user?.role === "ADMIN" || user?.role === "ADV" || user?.role === "GERENTE";
  const userRole = (user?.role ?? null) as Role | null;
  const [client, setClient] = useState<ClientProfileData | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [latestPhoneChecks, setLatestPhoneChecks] = useState<
    Partial<Record<string, PhoneCheckResult>>
  >({});
  const initialTab = (searchParams.get("tab") as ClientProfileTab | null) ?? "perfil";
  const [activeTab, setActiveTab] = useState<ClientProfileTab>(initialTab);
  const [highlightedFields, setHighlightedFields] = useState<Set<string>>(new Set());
  const [overwrittenFields, setOverwrittenFields] = useState<Set<string>>(new Set());

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
    ])
      .then(([, , catData]) => {
        setCategories(catData.categories ?? []);
      })
      .finally(() => setLoading(false));
  }, [loadClient, loadHistoryMeta]);

  if (loading) {
    return <p className="text-sm text-muted">Carregando cliente...</p>;
  }

  if (!client) {
    return (
      <>
        <p className="text-sm text-muted">Cliente não encontrado.</p>
        <Link href="/dashboard" className="btn-ghost mt-4 inline-flex">
          Voltar
        </Link>
      </>
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
        avatarUrl: null,
        mustChangePassword: false,
        hasFace: false,
        hasFaceConsent: false,
        workType: "CLT",
        gpsRequired: false,
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
      <ClientChecklistSection clientId={client.id} disabled={isFinalized} />
    </div>
  );

  const pesquisaContent = (
    <ClientPesquisaSectionConnected
      client={client}
      disabled={isFinalized}
      latestPhoneChecks={latestPhoneChecks}
      onUpdated={setClient}
      onPhoneCheckRecorded={refreshHistory}
      onExtractComplete={(fields, overwritten) => {
        setHighlightedFields(new Set(fields));
        setOverwrittenFields(new Set(overwritten));
        setActiveTab("revisao");
      }}
    />
  );

  const revisaoContent = (
    <ClientExtractionReview
      client={client}
      disabled={isFinalized}
      latestPhoneChecks={latestPhoneChecks}
      highlightedFields={highlightedFields}
      overwrittenFields={overwrittenFields}
      onUpdated={setClient}
      onPhoneCheckRecorded={refreshHistory}
    />
  );

  return (
    <>
      <ClientMobileQuickActions clientId={client.id} primaryPhone={client.phone1} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href="/dashboard" className="text-xs text-muted hover:text-foreground">
          ← Voltar ao painel
        </Link>
        {!isFinalized && (
          <button
            type="button"
            className="btn-ghost text-sm"
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
          activeTab={activeTab}
          onTabChange={setActiveTab}
          perfil={perfilContent}
          pesquisa={pesquisaContent}
          revisao={revisaoContent}
          historico={
            <div className="space-y-4">
              <ClientDuplicateBanner
                clientId={client.id}
                cpf={client.cpf}
                teseId={client.teseId}
              />
              <ClientHistoryComposer
                clientId={client.id}
                teamId={client.teamId}
                disabled={isFinalized}
                onSaved={refreshHistory}
              />
              <section className="panel-solid p-4">
                <h2 className="mb-4 text-xs font-semibold tracking-widest text-muted uppercase">
                  Timeline unificada
                </h2>
                <ClientUnifiedTimeline clientId={client.id} />
              </section>
              <section className="panel-solid p-4">
                <h2 className="mb-4 text-xs font-semibold tracking-widest text-muted uppercase">
                  Histórico detalhado
                </h2>
                <ClientHistoryTimeline clientId={client.id} refreshKey={historyRefreshKey} />
              </section>
            </div>
          }
          tarefas={<ClientTasksSection client={client} />}
          parentes={
            <section className="panel-solid p-5">
              <ClientRelativesPanel clientId={client.id} />
            </section>
          }
          acoes={canSeeAcoes ? <ClientAcoesTab clientId={client.id} /> : undefined}
        />
      </div>
    </>
  );
}
