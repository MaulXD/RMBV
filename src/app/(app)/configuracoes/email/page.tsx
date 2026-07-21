"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/SessionProvider";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ToastProvider";

type EmailConfigData = {
  id: string;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
  isActive: boolean;
};

const DEFAULT_FORM = {
  host: "",
  port: 587,
  secure: false,
  user: "",
  pass: "",
  fromName: "",
  fromEmail: "",
};

export default function EmailConfigPage() {
  const router = useRouter();
  const { user } = useSession();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [hasExisting, setHasExisting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canAccess =
    user && (user.role === "ADMIN" || user.role === "GERENTE");

  useEffect(() => {
    if (user === null) return;
    if (!canAccess) {
      router.replace("/dashboard");
    }
  }, [user, canAccess, router]);

  useEffect(() => {
    if (!canAccess) return;

    fetch("/api/email/config")
      .then((r) => r.json())
      .then((d: { config: EmailConfigData | null }) => {
        if (d.config) {
          setHasExisting(true);
          setForm({
            host: d.config.host,
            port: d.config.port,
            secure: d.config.secure,
            user: d.config.user,
            pass: "",
            fromName: d.config.fromName ?? "",
            fromEmail: d.config.fromEmail,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [canAccess]);

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setErrorMsg(null);
    setSaving(true);

    try {
      const res = await fetch("/api/email/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: form.host,
          port: Number(form.port),
          secure: form.secure,
          user: form.user,
          pass: form.pass,
          fromName: form.fromName || undefined,
          fromEmail: form.fromEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data?.error ?? "Erro ao salvar configuração");
        return;
      }

      setHasExisting(true);
      setForm((prev) => ({ ...prev, pass: "" }));
      toast("Configuração de e-mail salva com sucesso", "success");
    } catch {
      setErrorMsg("Erro de conexão");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (testing || !user) return;
    setErrorMsg(null);
    setTesting(true);

    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: user.email,
          subject: "Teste de conexao SMTP — SCS System",
          body: "Este e-mail confirma que a configuracao SMTP esta funcionando corretamente.",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data?.error === "E-mail não configurado") {
          setErrorMsg("Salve a configuracao antes de testar.");
        } else {
          setErrorMsg(data?.error ?? "Falha no teste de conexao");
        }
        return;
      }

      toast(`E-mail de teste enviado para ${user.email}`, "success");
    } catch {
      setErrorMsg("Erro de conexão ao testar");
    } finally {
      setTesting(false);
    }
  }

  if (!user || !canAccess) {
    return <p className="text-sm text-muted">Verificando permissoes...</p>;
  }

  if (loading) {
    return <p className="text-sm text-muted">Carregando configuracao...</p>;
  }

  return (
    <>
      <div className="page-header">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-primary"
            style={{
              background: "color-mix(in srgb, var(--color-primary) 10%, var(--color-surface-elevated))",
              borderColor: "color-mix(in srgb, var(--color-primary) 25%, transparent)",
            }}
          >
            <Icon name="mail" className="h-5 w-5" />
          </span>
          <div>
            <h1 className="page-title">Configuracao de e-mail</h1>
            <p className="page-subtitle">Servidor SMTP para envio de e-mails aos clientes</p>
          </div>
        </div>
      </div>

      <section className="industrial-panel max-w-2xl space-y-5 p-6">
        {hasExisting && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
            Configuracao ativa. A senha atual e mantida — preencha apenas para alterá-la.
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted">
                Host SMTP
              </label>
              <input
                type="text"
                className="industrial-input"
                placeholder="smtp.gmail.com"
                value={form.host}
                onChange={(e) => setField("host", e.target.value)}
                required
                disabled={saving}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                Porta
              </label>
              <input
                type="number"
                className="industrial-input"
                placeholder="587"
                min={1}
                max={65535}
                value={form.port}
                onChange={(e) => setField("port", Number(e.target.value))}
                required
                disabled={saving}
              />
            </div>

            <div className="flex items-center gap-3 pt-5">
              <input
                id="secure-check"
                type="checkbox"
                className="h-4 w-4 rounded border-border accent-primary"
                checked={form.secure}
                onChange={(e) => setField("secure", e.target.checked)}
                disabled={saving}
              />
              <label htmlFor="secure-check" className="text-sm text-foreground cursor-pointer">
                Usar SSL/TLS (porta 465)
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                Usuario SMTP
              </label>
              <input
                type="text"
                className="industrial-input"
                placeholder="usuario@gmail.com"
                value={form.user}
                onChange={(e) => setField("user", e.target.value)}
                required
                disabled={saving}
                autoComplete="username"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                Senha{hasExisting && " (deixe em branco para manter)"}
              </label>
              <input
                type="password"
                className="industrial-input"
                placeholder={hasExisting ? "••••••••" : "Senha ou app password"}
                value={form.pass}
                onChange={(e) => setField("pass", e.target.value)}
                required={!hasExisting}
                disabled={saving}
                autoComplete="current-password"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                Nome do remetente
              </label>
              <input
                type="text"
                className="industrial-input"
                placeholder="Nome do Escritorio"
                value={form.fromName}
                onChange={(e) => setField("fromName", e.target.value)}
                disabled={saving}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                E-mail do remetente
              </label>
              <input
                type="email"
                className="industrial-input"
                placeholder="contato@escritorio.com"
                value={form.fromEmail}
                onChange={(e) => setField("fromEmail", e.target.value)}
                required
                disabled={saving}
              />
            </div>
          </div>

          {errorMsg && (
            <p className="text-sm text-red-600 dark:text-red-400">{errorMsg}</p>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
            >
              {saving ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  Salvando...
                </>
              ) : (
                <>
                  <Icon name="check" className="h-4 w-4" />
                  Salvar configuracao
                </>
              )}
            </button>

            {hasExisting && (
              <button
                type="button"
                className="btn-ghost text-sm"
                onClick={handleTest}
                disabled={testing || saving}
              >
                {testing ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                    Testando...
                  </>
                ) : (
                  <>
                    <Icon name="send" className="h-4 w-4" />
                    Testar conexao
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </section>
    </>
  );
}
