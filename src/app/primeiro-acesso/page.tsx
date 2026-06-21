"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession, primeSessionCache } from "@/components/SessionProvider";
import { MultiCaptureFaceWizard } from "@/components/MultiCaptureFaceWizard";
import { Icon } from "@/components/ui/Icon";

type SetupStatus = {
  mustChangePassword: boolean;
  needsFace: boolean;
  needsConsent: boolean;
  isComplete: boolean;
};

export default function PrimeiroAcessoPage() {
  const router = useRouter();
  const { user, refresh } = useSession();
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [step, setStep] = useState<"password" | "face" | "done">("password");
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
        else router.replace("/dashboard");
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
      else router.replace("/dashboard");
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
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Icon name="shield" className="h-6 w-6" />
          </span>
          <h1 className="text-xl font-semibold">Configuração da conta</h1>
          <p className="mt-1 text-sm text-muted">
            {step === "password"
              ? "Altere sua senha provisória"
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
              requireConsent={status.needsConsent}
              allowUpload={false}
              onComplete={() => void handleFaceComplete()}
            />
          </div>
        )}

        {!status.mustChangePassword && !status.needsFace && status.needsConsent && (
          <p className="text-sm text-muted text-center">
            Rosto já cadastrado pelo gestor. Redirecionando...
          </p>
        )}
      </div>
    </div>
  );
}
