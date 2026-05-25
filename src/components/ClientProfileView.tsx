"use client";

import type { ClientProfileData } from "@/lib/client-fields";
import { CLIENT_FIELD_GROUPS } from "@/lib/client-fields";
import { StatusBadge } from "./StatusBadge";

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

      {CLIENT_FIELD_GROUPS.map((group) => (
        <section key={group.title} className="industrial-panel p-4">
          <h3 className="mb-4 text-xs font-semibold tracking-widest text-muted uppercase">
            {group.title}
          </h3>
          <dl className="grid gap-3 sm:grid-cols-2">
            {group.fields.map((field) => {
              const value = client[field.key as keyof ClientProfileData];
              return (
                <div key={field.key}>
                  <dt className="text-xs text-muted">{field.label}</dt>
                  <dd className="mt-0.5 text-sm font-medium break-words">
                    {value ? String(value) : "—"}
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>
      ))}
    </div>
  );
}
