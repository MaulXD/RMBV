"use client";

import type { ClientProfileData } from "@/lib/client-fields";
import { CLIENT_FIELD_GROUPS } from "@/lib/client-fields";
import { StatusBadge } from "./StatusBadge";
import { CopyButton } from "./CopyButton";

function isPhoneKey(key: string) {
  return /^phone\d+$/.test(key);
}

export function ClientProfileView({ client }: { client: ClientProfileData }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold">{client.name}</h2>
        <StatusBadge status={client.status} />
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

      {CLIENT_FIELD_GROUPS.map((group) => (
        <section key={group.title} className="industrial-panel p-4">
          <h3 className="mb-4 text-xs font-semibold tracking-widest text-muted uppercase">
            {group.title}
          </h3>
          <dl className="grid gap-3 sm:grid-cols-2">
            {group.fields.map((field) => {
              const value = client[field.key as keyof ClientProfileData];
              const text = value ? String(value) : "";
              const isPhone = isPhoneKey(field.key);

              return (
                <div key={field.key}>
                  <dt className="text-xs text-muted">{field.label}</dt>
                  {isPhone && text ? (
                    <dd className="mt-0.5 flex items-center gap-1">
                      <span className="min-w-0 flex-1 text-sm font-medium break-words">
                        {text}
                      </span>
                      <CopyButton value={text} label={`Copiar ${field.label}`} />
                    </dd>
                  ) : (
                    <dd className="mt-0.5 text-sm font-medium break-words">
                      {text || "—"}
                    </dd>
                  )}
                </div>
              );
            })}
          </dl>
        </section>
      ))}

      {client.rawExtractText && (
        <section className="industrial-panel p-4">
          <h3 className="mb-3 text-xs font-semibold tracking-widest text-muted uppercase">
            Texto para extração
          </h3>
          <pre className="whitespace-pre-wrap font-mono text-xs text-muted">
            {client.rawExtractText}
          </pre>
        </section>
      )}
    </div>
  );
}
