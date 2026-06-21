"use client";

import { useCallback, useEffect, useState } from "react";
import { FaceEnrollment } from "./FaceEnrollment";
import { useSession } from "./SessionProvider";
import { useToast } from "./ToastProvider";

type Settings = {
  allowGerenteFaceEnrollment: boolean;
  canConfigure: boolean;
};

export function TeamFaceEnrollmentPanel({
  teamId,
  showSettings = true,
}: {
  teamId: string;
  showSettings?: boolean;
}) {
  const { user } = useSession();
  const toast = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (user?.role === "ADMIN") params.set("teamId", teamId);
      const res = await fetch(`/api/equipe/face-enrollment-settings?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao carregar");
      setSettings({
        allowGerenteFaceEnrollment: data.allowGerenteFaceEnrollment ?? false,
        canConfigure: data.canConfigure ?? false,
      });
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao carregar configurações", "error");
    } finally {
      setLoading(false);
    }
  }, [teamId, user?.role]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleGerenteAllowed(next: boolean) {
    setSaving(true);
    try {
      const params = new URLSearchParams();
      if (user?.role === "ADMIN") params.set("teamId", teamId);
      const res = await fetch(`/api/equipe/face-enrollment-settings?${params}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowGerenteFaceEnrollment: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao salvar");
      setSettings({
        allowGerenteFaceEnrollment: data.allowGerenteFaceEnrollment,
        canConfigure: data.canConfigure,
      });
      toast(next ? "Gerente pode cadastrar rostos da equipe" : "Cadastro pelo gerente desativado", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao salvar", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !settings || !user) {
    return <p className="text-sm text-muted">Carregando cadastro facial...</p>;
  }

  const canEnroll =
    user.role === "ADMIN" ||
    user.role === "ADV" ||
    (user.role === "GERENTE" && settings.allowGerenteFaceEnrollment);

  return (
    <div className="space-y-5 max-w-2xl">
      {showSettings && settings.canConfigure && (
        <div className="panel-solid p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Permissões de cadastro</h3>
              <p className="mt-1 text-xs text-muted leading-relaxed">
                Como ADV, você pode cadastrar rostos a qualquer momento. Ative abaixo para permitir
                que o <strong>Gerente</strong> também cadastre colaboradores da equipe.
              </p>
            </div>
            <label className="flex cursor-pointer items-center gap-2 shrink-0">
              <span className="text-xs font-medium text-muted">Gerente pode cadastrar</span>
              <button
                type="button"
                role="switch"
                aria-checked={settings.allowGerenteFaceEnrollment}
                disabled={saving}
                onClick={() => void toggleGerenteAllowed(!settings.allowGerenteFaceEnrollment)}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  settings.allowGerenteFaceEnrollment ? "bg-primary" : "bg-border"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    settings.allowGerenteFaceEnrollment ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </label>
          </div>
        </div>
      )}

      {canEnroll ? (
        <FaceEnrollment teamId={teamId} />
      ) : user.role === "GERENTE" ? (
        <p className="alert alert-warn text-sm">
          O ADV ainda não liberou o cadastro facial de colaboradores para gerentes. Solicite a
          ativação em Configurações → Ponto facial.
        </p>
      ) : null}
    </div>
  );
}
