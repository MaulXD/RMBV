"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession, primeSessionCache } from "@/components/SessionProvider";
import { MultiCaptureFaceWizard } from "@/components/MultiCaptureFaceWizard";
import { Icon } from "@/components/ui/Icon";
import { LGPD_FACE_CONSENT_TEXT } from "@/lib/lgpd-face-consent";

type SetupStatus = {
  mustChangePassword: boolean;
  needsFace: boolean;
  needsConsent: boolean;
  isComplete: boolean;
};

type Step = "password" | "face" | "consent" | "done";

export default function PrimeiroAcessoPage() {
  const router = useRouter();
  const { user, refresh } = useSession();
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [step, setStep] = useState<Step>("password");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    fetch("/api/users/me/account-setup")
      .then((r) => r.json())
      .then((d: SetupStatus) => {
        setStatus(d);
        if (d.isComplete) {
          router.replace("/dashboard");
          return;
        }
        if (d.mustChangePassword) setStep("password");
        else if (d.needsFace) setStep("face");
        else if (d.needsConsent) setStep("consent");
      });
  }, [user, router]);

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/users/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao alterar senha");

      await refresh();
      const next = await fetch("/api/users/me/account-setup").then((r) => r.json());
      setStatus(next);
      if (next.needsFace) setStep("face");
      else if (next.needsConsent) setStep("consent");
      else router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    } finally {
      setSaving(false);
    }
  }

  async function handleConsentOnly() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${user!.id}/face`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acceptConsent: true, consentOnly: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao registrar consentimento");
      await handleFaceComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    } finally {
      setSaving(false);
    }
  }

  async function handleFaceComplete() {
    await refresh();
    const me = await fetch("/api/auth/me").then((r) => r.json());
    if (me.user) primeSessionCache(me.user);
    router.replace("/dashboard");
  }

  if (!user || !status) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="safe-area-top flex min-h-dvh flex-col items-center justify-start overflow-y-auto px-4 py-6 sm:justify-center sm:py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Icon name="shield" className="h-6 w-6" />
          </span>
          <h1 className="text-xl font-semibold">Configuração da conta</h1>
          <p className="mt-1 text-sm text-muted">
            {step === "password"
              ? "Altere sua senha provisória"
              : step === "consent"
                ? "Aceite o termo LGPD para continuar"
                : "Cadastro facial obrigatório para ponto digital"}
          </p>
        </div>

        {step === "password" && status.mustChangePassword && (
          <form onSubmit={(e) => void handlePassword(e)} className="panel-solid space-y-4 p-5">
            <div>
              <label className="form-label">Senha atual (provisória)</label>
              <input
                type="password"
                className="industrial-input w-full"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="form-label">Nova senha</label>
              <input
                type="password"
                className="industrial-input w-full"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <div>
              <label className="form-label">Confirmar nova senha</label>
              <input
                type="password"
                className="industrial-input w-full"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={saving}>
              {saving ? "Salvando..." : "Continuar"}
            </button>
          </form>
        )}

        {step === "face" && status.needsFace && user && (
          <div className="panel-solid p-5">
            <MultiCaptureFaceWizard
              userId={user.id}
              requireConsent
              allowUpload={false}
              onComplete={() => void handleFaceComplete()}
            />
          </div>
        )}

        {step === "consent" && status.needsConsent && !status.needsFace && user && (
          <ConsentOnlyStep
            onAccept={() => void handleConsentOnly()}
            saving={saving}
            error={error}
          />
        )}
      </div>
    </div>
  );
}

function ConsentOnlyStep({
  onAccept,
  saving,
  error,
}: {
  onAccept: () => void;
  saving: boolean;
  error: string | null;
}) {
  const [consent, setConsent] = useState(false);

  return (
    <div className="panel-solid space-y-4 p-5">
      <p className="text-sm text-muted">
        Seu rosto já foi cadastrado pelo gestor. Aceite o termo LGPD para usar o ponto digital.
      </p>
      <div className="max-h-48 overflow-y-auto rounded-lg border border-border p-4 text-xs text-muted whitespace-pre-wrap">
        {LGPD_FACE_CONSENT_TEXT}
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1"
        />
        <span>Li e aceito o tratamento dos dados biométricos para controle de ponto.</span>
      </label>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        type="button"
        className="btn-primary w-full"
        disabled={!consent || saving}
        onClick={onAccept}
      >
        {saving ? "Salvando..." : "Continuar"}
      </button>
    </div>
  );
}
