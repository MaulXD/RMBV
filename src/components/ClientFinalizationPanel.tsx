"use client";

import { useState } from "react";
import type { ClientProfileData } from "@/lib/client-fields";
import { WorkflowBadge } from "./WorkflowBadge";

export function ClientFinalizationPanel({
  client,
  canFinalize,
  canRequest,
  onUpdated,
}: {
  client: ClientProfileData;
  canFinalize: boolean;
  canRequest: boolean;
  onUpdated: (client: ClientProfileData) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function callAction(url: string) {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(url, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Operação falhou");
      onUpdated(data.client);
      setMessage(data.message ?? "Concluído.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  }

  const isFinalized = client.workflowStatus === "FINALIZADO";
  const isPending = client.workflowStatus === "FINALIZACAO_SOLICITADA";
  const isOpen = client.workflowStatus === "EM_ANDAMENTO";

  const bannerTone =
    isFinalized
      ? "border-emerald-500/20 bg-emerald-500/[0.04]"
      : isPending
        ? "border-amber-500/20 bg-amber-500/[0.04]"
        : "border-border bg-surface-elevated/60";

  return (
    <section className={`mb-4 rounded-[var(--radius-ui)] border px-4 py-3 ${bannerTone}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <span className="text-muted">
            Colaboradores solicitam · Gerente, ADV ou Admin aprovam
          </span>
          {client.finalizationRequestedAt && (
            <span className="text-muted">
              Solicitado por{" "}
              <strong className="text-foreground">
                {client.finalizationRequestedBy?.name ?? "—"}
              </strong>
            </span>
          )}
          {client.finalizedAt && (
            <span className="text-muted">
              Finalizado por{" "}
              <strong className="text-foreground">{client.finalizedBy?.name ?? "—"}</strong>
            </span>
          )}
          {isFinalized && (
            <span className="text-xs text-amber-700 dark:text-amber-400">Edição bloqueada</span>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <WorkflowBadge status={client.workflowStatus} />
          {canRequest && isOpen && (
            <button
              type="button"
              className="btn-primary text-xs"
              disabled={loading}
              onClick={() =>
                callAction(`/api/clients/${client.id}/request-finalization`)
              }
            >
              {loading ? "Enviando..." : "Solicitar finalização"}
            </button>
          )}
          {canFinalize && isPending && (
            <button
              type="button"
              className="btn-primary text-xs"
              disabled={loading}
              onClick={() => callAction(`/api/clients/${client.id}/finalize`)}
            >
              {loading ? "Finalizando..." : "Aprovar e finalizar"}
            </button>
          )}
        </div>
      </div>

      {isPending && !canFinalize && (
        <p className="mt-2 text-xs text-muted">
          Aguardando aprovação de Gerente, ADV ou Administrador.
        </p>
      )}

      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {message && <p className="mt-2 text-sm text-muted">{message}</p>}
    </section>
  );
}
