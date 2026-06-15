"use client";

import type { PhoneCheckResult } from "@prisma/client";
import type { ClientProfileData } from "@/lib/client-fields";
import { CLIENT_FIELD_GROUPS, PHONE_FIELD_KEYS } from "@/lib/client-fields";
import { StatusBadge } from "./StatusBadge";
import { WorkflowBadge } from "./WorkflowBadge";
import { CopyButton } from "./CopyButton";
import { PhoneCheckButtons } from "./PhoneCheckButtons";

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
  const filledPhones = PHONE_FIELD_KEYS.map((key, index) => ({
    key,
    label: `TELEFONE ${index + 1}`,
    value: String(client[key] ?? "").trim(),
  })).filter((p) => p.value);

  const nonPhoneGroups = CLIENT_FIELD_GROUPS.filter((g) => g.title !== "Telefones");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold">{client.name}</h2>
        <StatusBadge status={client.status} />
        <WorkflowBadge status={client.workflowStatus} />
        {client.categories.map((c) => (
          <span
            key={c.id}
            className="rounded-[var(--radius-ui)] border border-border px-2 py-0.5 text-xs text-muted"
          >
            {c.name}
          </span>
        ))}
      </div>

      <section className="industrial-panel p-4">
        <h3 className="mb-2 text-xs font-semibold tracking-widest text-muted uppercase">
          Tese
        </h3>
        <p className="text-sm font-medium">{client.tese ?? "—"}</p>
      </section>

      {nonPhoneGroups.map((group) => (
        <section key={group.title} className="industrial-panel p-4">
          <h3 className="mb-4 text-xs font-semibold tracking-widest text-muted uppercase">
            {group.title}
          </h3>
          <dl className="grid gap-3 sm:grid-cols-2">
            {group.fields.map((field) => {
              const value = client[field.key as keyof ClientProfileData];
              const text = value ? String(value) : "";

              return (
                <div key={field.key}>
                  <dt className="text-xs text-muted">{field.label}</dt>
                  <dd className="mt-0.5 text-sm font-medium break-words">{text || "—"}</dd>
                </div>
              );
            })}
          </dl>
        </section>
      ))}

      <section className="industrial-panel p-4">
        <h3 className="mb-4 text-xs font-semibold tracking-widest text-muted uppercase">
          Telefones
        </h3>
        {filledPhones.length === 0 ? (
          <p className="text-sm text-muted">Nenhum telefone cadastrado.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filledPhones.map((phone) => (
              <div key={phone.key} className="field-card">
                <p className="text-xs text-muted">{phone.label}</p>
                <p className="mt-1 text-sm font-medium break-words">{phone.value}</p>
                <div className="action-toolbar">
                  <CopyButton value={phone.value} label={`Copiar ${phone.label}`} compact />
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
        )}
      </section>
    </div>
  );
}
