"use client";

import { useState } from "react";
import type { PhoneCheckResult } from "@prisma/client";
import type { ClientProfileData } from "@/lib/client-fields";
import { CLIENT_FIELD_GROUPS, PHONE_FIELD_KEYS, clientCompleteness } from "@/lib/client-fields";
import { StatusBadge } from "./StatusBadge";
import { WorkflowBadge } from "./WorkflowBadge";
import { CopyButton } from "./CopyButton";
import { WhatsAppButton } from "./WhatsAppButton";
import { PhoneCheckButtons } from "./PhoneCheckButtons";
import { Icon } from "./ui/Icon";

export function ClientProfileView({
  client,
  latestPhoneChecks,
  onPhoneCheckRecorded,
  phoneActionsDisabled,
}: {
  client: ClientProfileData;
  latestPhoneChecks?: Partial<Record<string, PhoneCheckResult>>;
  onPhoneCheckRecorded?: () => void;
  phoneActionsDisabled?: boolean;
}) {
  const [buscaCpfAberta, setBuscaCpfAberta] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [progressLabel, setProgressLabel] = useState("");
  const [resultadosCpf, setResultadosCpf] = useState<Array<{ tribunal: string; processos: Array<{ numero: string; classe?: string; ultimaMovimentacao?: string }> }> | null>(null);
  const [erroCpf, setErroCpf] = useState("");

  const filledPhones = PHONE_FIELD_KEYS.map((key, index) => ({
    key,
    label: `Telefone ${index + 1}`,
    value: String(client[key] ?? "").trim(),
  })).filter((p) => p.value);

  const cpf = String(client.cpf ?? "").trim();

  const handleBuscarCPF = async () => {
    setBuscaCpfAberta(true);
    setBuscando(true);
    setErroCpf("");
    setResultadosCpf([]);
    setProgressLabel("");
    try {
      const res = await fetch("/api/processos/consulta-cpf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf }),
      });
      if (!res.ok || !res.body) { setErroCpf("Erro ao consultar CPF"); setBuscando(false); return; }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const ev = JSON.parse(line) as { type: string; tribunal?: string; processos?: Array<{ numero: string; classe?: string; ultimaMovimentacao?: string }> };
            if (ev.type === "checking" && ev.tribunal) {
              setProgressLabel(`Verificando ${ev.tribunal.toUpperCase().replace(/^TRF(\d)/, "TRF $1").replace(/^TRT(\d+)/, "TRT $1")}...`);
            } else if (ev.type === "result" && ev.tribunal && ev.processos) {
              setResultadosCpf((prev) => [...(prev ?? []), { tribunal: ev.tribunal!.toUpperCase(), processos: ev.processos! }]);
            } else if (ev.type === "done") {
              setProgressLabel("");
            }
          } catch { /* malformed line */ }
        }
      }
    } catch {
      setErroCpf("Erro de conexão");
    } finally {
      setBuscando(false);
      setProgressLabel("");
    }
  };

  const nonPhoneGroups = CLIENT_FIELD_GROUPS.filter((g) => g.title !== "Telefones");
  const completeness = clientCompleteness(client);

  return (
    <div className="space-y-4">
      {/* Identity header */}
      <div className="soft-card p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold leading-tight text-foreground sm:text-xl">
              {client.name}
            </h2>
            {client.tese && (
              <p className="mt-1 text-sm text-muted">
                Tese:{" "}
                <span className="font-semibold text-primary">{client.tese}</span>
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={client.status} />
            <WorkflowBadge status={client.workflowStatus} />
            {client.categories.map((c) => (
              <span
                key={c.id}
                className="rounded-md border border-border px-2 py-0.5 text-xs text-muted"
              >
                {c.name}
              </span>
            ))}
            {completeness.score < 100 && (
              <span
                title={completeness.missing.length ? `Faltam: ${completeness.missing.join(", ")}` : "Cadastro completo"}
                className={`rounded-md border px-2 py-0.5 text-xs font-medium ${
                  completeness.score >= 67
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
                }`}
              >
                {completeness.score}% preenchido
              </span>
            )}
            {cpf && (
              <button
                type="button"
                onClick={handleBuscarCPF}
                className="btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-xs"
              >
                <Icon name="search" className="h-3.5 w-3.5" />
                Buscar processos
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Field sections — skip fully empty ones */}
      {nonPhoneGroups.map((group) => {
        const filledFields = group.fields.filter((field) => {
          const val = client[field.key as keyof ClientProfileData];
          return val && String(val).trim();
        });

        if (filledFields.length === 0) return null;

        return (
          <section key={group.title} className="soft-card overflow-hidden">
            <div className="border-b border-border bg-surface px-5 py-2.5">
              <h3 className="text-[11px] font-bold tracking-widest text-muted uppercase">
                {group.title}
              </h3>
            </div>
            <dl className="grid grid-cols-1 divide-y divide-border/50 sm:grid-cols-2 sm:divide-y-0">
              {filledFields.map((field, i) => {
                const value = client[field.key as keyof ClientProfileData];
                const text = String(value ?? "").trim();

                return (
                  <div
                    key={field.key}
                    className={`px-5 py-3.5 ${
                      i % 2 === 0 && i === filledFields.length - 1
                        ? "sm:col-span-2"
                        : ""
                    }`}
                  >
                    <dt className="mb-0.5 text-[11px] font-medium tracking-wide text-muted uppercase">
                      {field.label}
                    </dt>
                    <dd className="text-sm font-semibold text-foreground break-words">
                      {text}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
        );
      })}

      {/* Phones — skip if none */}
      {filledPhones.length > 0 && (
        <section className="soft-card overflow-hidden">
          <div className="border-b border-border bg-surface px-5 py-2.5">
            <h3 className="text-[11px] font-bold tracking-widest text-muted uppercase">
              Telefones
            </h3>
          </div>
          <div className="grid gap-px bg-border/30 sm:grid-cols-2">
            {filledPhones.map((phone) => (
              <div key={phone.key} className="bg-surface-elevated px-5 py-3.5">
                <p className="mb-0.5 text-[11px] font-medium tracking-wide text-muted uppercase">
                  {phone.label}
                </p>
                <p className="text-sm font-semibold text-foreground break-words">
                  {phone.value}
                </p>
                <div className="action-toolbar mt-2">
                  <CopyButton value={phone.value} label={`Copiar ${phone.label}`} compact />
                  <WhatsAppButton value={phone.value} compact />
                  <PhoneCheckButtons
                    clientId={client.id}
                    phoneKey={phone.key}
                    phoneValue={phone.value}
                    currentResult={latestPhoneChecks?.[phone.key]}
                    disabled={phoneActionsDisabled}
                    onRecorded={onPhoneCheckRecorded}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Modal busca por CPF */}
      {buscaCpfAberta && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]">
          <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-surface-elevated shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold">Busca de processos por CPF</h2>
                <p className="text-xs text-muted">CPF: {cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}</p>
              </div>
              <button type="button" onClick={() => setBuscaCpfAberta(false)} className="rounded-lg p-1 text-muted hover:bg-surface">
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto p-5">
              {erroCpf ? (
                <div className="rounded-lg border border-dashed border-red-500/30 py-8 text-center">
                  <p className="text-sm text-red-500">{erroCpf}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {buscando && (
                    <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5">
                      <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <span className="text-xs text-muted">{progressLabel || "Consultando tribunais..."}</span>
                    </div>
                  )}
                  {!buscando && resultadosCpf?.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border py-8 text-center">
                      <p className="text-sm text-muted">Nenhum processo encontrado para este CPF.</p>
                    </div>
                  )}
                  {resultadosCpf?.map((result) => (
                    <div key={result.tribunal} className="rounded-lg border border-border bg-surface p-3">
                      <h3 className="mb-2 text-xs font-semibold text-foreground">{result.tribunal}</h3>
                      <div className="space-y-1.5">
                        {result.processos.map((p, idx) => (
                          <div key={idx} className="flex items-start justify-between gap-2 rounded-md bg-surface-elevated px-3 py-2">
                            <div className="min-w-0">
                              <p className="font-mono text-xs font-medium text-primary">{p.numero}</p>
                              {p.classe && <p className="text-[10px] text-muted">{p.classe}</p>}
                            </div>
                            {p.ultimaMovimentacao && (
                              <span className="shrink-0 text-[10px] text-muted/60">{p.ultimaMovimentacao}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
