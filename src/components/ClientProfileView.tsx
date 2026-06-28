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
import { DatajudBuscaCPF } from "./DatajudBuscaCPF";

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
  const [buscaFonte, setBuscaFonte] = useState<"datajud" | "eproc">("datajud");

  const filledPhones = PHONE_FIELD_KEYS.map((key, index) => ({
    key,
    label: `Telefone ${index + 1}`,
    value: String(client[key] ?? "").trim(),
  })).filter((p) => p.value);

  const cpf = String(client.cpf ?? "").trim();

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
                onClick={() => setBuscaCpfAberta(true)}
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
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-surface-elevated shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold">Busca de processos por CPF</h2>
                <p className="text-xs text-muted">
                  CPF: {cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBuscaCpfAberta(false)}
                className="rounded-lg p-1 text-muted hover:bg-surface"
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>

            {/* Source tabs */}
            <div className="flex shrink-0 border-b border-border">
              {(["datajud", "eproc"] as const).map((fonte) => (
                <button
                  key={fonte}
                  type="button"
                  onClick={() => setBuscaFonte(fonte)}
                  className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                    buscaFonte === fonte
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {fonte === "datajud" ? "Datajud CNJ (57 tribunais)" : "eproc / PJe (TRFs direto)"}
                </button>
              ))}
            </div>

            <div className="overflow-y-auto p-5">
              {buscaFonte === "datajud" ? (
                <DatajudBuscaCPF
                  key="datajud"
                  endpoint="/api/processos/consulta-cpf"
                  requestBody={{ cpf }}
                />
              ) : (
                <EprocLinks cpf={cpf} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EprocLinks({ cpf }: { cpf: string }) {
  const formatted = cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");

  const links = [
    {
      label: "PJe TRF5 (Juizado Especial Federal)",
      url: "https://pje1g.trf5.jus.br/pjeconsulta/ConsultaPublica/listView.seam",
      hint: "Campo: CPF · selecione 'CPF' e cole o número",
    },
    {
      label: "eproc TRF5 (processos comuns)",
      url: "https://eproc1g.trf5.jus.br/eproc/externo_controlador.php?acao=processo_consulta_publica",
      hint: "Campo: Documento da parte",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2.5">
        <span className="text-xs text-muted">CPF para pesquisar:</span>
        <span className="font-mono text-sm font-semibold text-foreground">{formatted}</span>
        <CopyButton value={formatted} label="Copiar CPF" compact />
      </div>

      <p className="text-xs text-muted">
        A consulta por CPF no servidor é bloqueada por segredo de justiça para processos JEF/INSS.
        Abra o sistema diretamente e pesquise com o CPF acima.
      </p>

      <div className="space-y-2">
        {links.map((link) => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-start gap-3 rounded-lg border border-border bg-surface px-3 py-3 text-left transition-colors hover:bg-surface-elevated hover:border-primary/30"
          >
            <Icon name="externalLink" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground">{link.label}</p>
              <p className="text-[10px] text-muted">{link.hint}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
