"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/SessionProvider";
import { Icon } from "@/components/ui/Icon";

type WhatsAppConfigData = {
  id: string;
  instanceId: string;
  token: string;
  phone: string | null;
  isActive: boolean;
};

const DEFAULT_FORM = {
  instanceId: "",
  token: "",
  phone: "",
};

export default function WhatsAppConfigPage() {
  const router = useRouter();
  const { user } = useSession();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [hasExisting, setHasExisting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");

  const canAccess =
    user &&
    (user.role === "ADMIN" || user.role === "GERENTE" || user.role === "ADV");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setWebhookUrl(`${window.location.origin}/api/whatsapp/webhook`);
    }
  }, []);

  useEffect(() => {
    if (user === null) return;
    if (!canAccess) {
      router.replace("/dashboard");
    }
  }, [user, canAccess, router]);

  useEffect(() => {
    if (!canAccess) return;

    fetch("/api/whatsapp/config")
      .then((r) => r.json())
      .then((d: { config: WhatsAppConfigData | null }) => {
        if (d.config) {
          setHasExisting(true);
          setForm({
            instanceId: d.config.instanceId,
            token: d.config.token,
            phone: d.config.phone ?? "",
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [canAccess]);

  function setField<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setSaving(true);

    try {
      const res = await fetch("/api/whatsapp/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instanceId: form.instanceId.trim(),
          token: form.token.trim(),
          phone: form.phone.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data?.error ?? "Erro ao salvar configuracao");
        return;
      }

      setHasExisting(true);
      setSuccessMsg("Configuracao salva com sucesso");
    } catch {
      setErrorMsg("Erro de conexao");
    } finally {
      setSaving(false);
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
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-green-600 dark:text-green-400"
            style={{
              background:
                "color-mix(in srgb, #22c55e 10%, var(--color-surface-elevated))",
              borderColor: "color-mix(in srgb, #22c55e 25%, transparent)",
            }}
          >
            <Icon name="messageCircle" className="h-5 w-5" />
          </span>
          <div>
            <h1 className="page-title">Configuracao do WhatsApp</h1>
            <p className="page-subtitle">
              Integre com Z-API ou Evolution API para envio e recebimento de mensagens
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl space-y-6">
        {webhookUrl && (
          <section className="industrial-panel p-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">
              URL do Webhook
            </h2>
            <p className="mb-3 text-sm text-muted">
              Configure esta URL no painel da sua API (Z-API ou Evolution) para receber
              mensagens automaticamente:
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
              <code className="flex-1 break-all text-sm text-foreground">
                {webhookUrl}
              </code>
              <button
                type="button"
                className="btn-ghost shrink-0 px-2 py-1 text-xs"
                onClick={() => {
                  navigator.clipboard.writeText(webhookUrl).catch(() => {});
                }}
                title="Copiar URL"
              >
                <Icon name="copy" className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-xs text-muted">
              Para Z-API, inclua o parametro{" "}
              <code className="rounded bg-surface px-1">?instance=SEU_INSTANCE_ID</code>{" "}
              na URL ou configure o header{" "}
              <code className="rounded bg-surface px-1">x-instance-id</code>.
            </p>
          </section>
        )}

        <section className="industrial-panel p-6">
          {hasExisting && (
            <div className="mb-5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
              Configuracao ativa. Atualize os campos abaixo para alterar.
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                Instance ID
              </label>
              <input
                type="text"
                className="industrial-input"
                placeholder="Ex.: minha-instancia ou ID numerico da Z-API"
                value={form.instanceId}
                onChange={(e) => setField("instanceId", e.target.value)}
                required
                disabled={saving}
              />
              <p className="mt-1 text-xs text-muted">
                Z-API: ID da instancia no painel. Evolution: nome da instancia.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                Token
              </label>
              <input
                type="password"
                className="industrial-input"
                placeholder={hasExisting ? "Deixe em branco para manter o atual" : "Token de autenticacao da API"}
                value={form.token}
                onChange={(e) => setField("token", e.target.value)}
                required={!hasExisting}
                disabled={saving}
                autoComplete="off"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                Numero do WhatsApp (opcional)
              </label>
              <input
                type="tel"
                className="industrial-input"
                placeholder="Ex.: 5511999999999"
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                disabled={saving}
              />
              <p className="mt-1 text-xs text-muted">
                Numero com DDD e codigo do pais (55). Usado apenas para referencia.
              </p>
            </div>

            {errorMsg && (
              <p className="text-sm text-red-600 dark:text-red-400">{errorMsg}</p>
            )}

            {successMsg && (
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                {successMsg}
              </p>
            )}

            <div className="flex items-center gap-3 pt-1">
              <button type="submit" className="btn-primary" disabled={saving}>
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
            </div>
          </form>
        </section>
      </div>
    </>
  );
}
