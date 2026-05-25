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

  return (
    <section className="industrial-panel space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold tracking-widest text-muted uppercase">
            Finalização do cliente
          </h3>
          <p className="mt-1 text-xs text-muted">
            Colaboradores solicitam · Gerente, ADV ou Admin aprovam
          </p>
        </div>
        <WorkflowBadge status={client.workflowStatus} />
      </div>

      {client.finalizationRequestedAt && (
        <p className="text-sm text-muted">
          Solicitado por {client.finalizationRequestedBy?.name ?? "—"} em{" "}
          {new Date(client.finalizationRequestedAt).toLocaleString("pt-BR")}
        </p>
      )}
      {client.finalizedAt && (
        <p className="text-sm text-muted">
          Finalizado por {client.finalizedBy?.name ?? "—"} em{" "}
          {new Date(client.finalizedAt).toLocaleString("pt-BR")}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {canRequest && isOpen && (
          <button
            type="button"
            className="btn-primary"
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
            className="btn-primary"
            disabled={loading}
            onClick={() => callAction(`/api/clients/${client.id}/finalize`)}
          >
            {loading ? "Finalizando..." : "Aprovar e finalizar"}
          </button>
        )}
        {isFinalized && (
          <span className="text-sm text-muted">Cliente concluído — edição bloqueada.</span>
        )}
        {isPending && !canFinalize && (
          <span className="text-sm text-muted">
            Aguardando aprovação de Gerente, ADV ou Administrador.
          </span>
        )}
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {message && <p className="text-sm text-muted">{message}</p>}
    </section>
  );
}
