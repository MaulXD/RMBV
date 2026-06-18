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
    label: `Telefone ${index + 1}`,
    value: String(client[key] ?? "").trim(),
  })).filter((p) => p.value);

  const nonPhoneGroups = CLIENT_FIELD_GROUPS.filter((g) => g.title !== "Telefones");

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
    </div>
  );
}
