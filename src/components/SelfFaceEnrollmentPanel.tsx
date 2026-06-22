"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "./ui/Icon";
import { MultiCaptureFaceWizard } from "./MultiCaptureFaceWizard";

/** Cadastro / recadastro facial do próprio usuário — fluxo multi-pose + prova de vida. */
export function SelfFaceEnrollmentPanel({
  userId,
  onUpdated,
}: {
  userId: string;
  onUpdated?: () => void;
}) {
  const [hasFace, setHasFace] = useState<boolean | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [removing, setRemoving] = useState(false);

  const refresh = useCallback(async () => {
    const r = await fetch(`/api/users/${userId}/face`);
    const d = (await r.json()) as { hasDescriptor?: boolean };
    setHasFace(d.hasDescriptor ?? false);
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function removeFace() {
    setRemoving(true);
    await fetch(`/api/users/${userId}/face`, { method: "DELETE" });
    await refresh();
    onUpdated?.();
    setRemoving(false);
  }

  function handleComplete() {
    void refresh();
    onUpdated?.();
    setWizardOpen(false);
  }

  return (
    <div className="mt-6 border-t border-border pt-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="scanFace" className="h-4 w-4 text-emerald-500" />
          <span className="text-sm font-semibold text-foreground">Reconhecimento facial</span>
        </div>
        {hasFace !== null && (
          <span
            className={`flex items-center gap-1.5 text-xs font-medium ${hasFace ? "text-emerald-600" : "text-muted"}`}
          >
            <span className={`h-2 w-2 rounded-full ${hasFace ? "bg-emerald-500" : "bg-muted/40"}`} />
            {hasFace ? "Cadastrado" : "Não cadastrado"}
          </span>
        )}
      </div>

      <p className="mb-3 text-xs text-muted">
        {hasFace
          ? "Recadastre com prova de vida e 3 poses para melhorar o reconhecimento no ponto."
          : "Cadastre com prova de vida e 3 poses (frente, cima e baixo)."}
      </p>

      {!wizardOpen && (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={hasFace === null}
            onClick={() => setWizardOpen(true)}
            className="btn-ghost flex items-center gap-2 text-sm disabled:opacity-50"
          >
            <Icon name="camera" className="h-4 w-4" />
            {hasFace ? "Recadastrar rosto" : "Cadastrar via câmera"}
          </button>
          {hasFace && (
            <button
              type="button"
              disabled={removing}
              onClick={() => void removeFace()}
              className="btn-ghost flex items-center gap-2 text-sm text-red-500 hover:text-red-600 disabled:opacity-50"
            >
              <Icon name="trash" className="h-4 w-4" />
              Remover
            </button>
          )}
        </div>
      )}

      {wizardOpen && (
        <div className="space-y-3 rounded-xl border border-border bg-surface-elevated p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              {hasFace ? "Recadastro facial" : "Cadastro facial"}
            </h3>
            <button
              type="button"
              onClick={() => setWizardOpen(false)}
              className="btn-ghost p-1"
              aria-label="Fechar cadastro"
            >
              <Icon name="x" className="h-4 w-4" />
            </button>
          </div>
          <MultiCaptureFaceWizard
            key={hasFace ? "recapture" : "enroll"}
            userId={userId}
            requireConsent={!hasFace}
            startAt={hasFace ? "camera" : "instructions"}
            allowUpload={false}
            onComplete={handleComplete}
          />
        </div>
      )}
    </div>
  );
}
