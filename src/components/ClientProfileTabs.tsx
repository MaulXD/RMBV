"use client";

import { useState } from "react";

export type ClientProfileTab = "perfil" | "historico";

export function ClientProfileTabs({
  perfil,
  historico,
  defaultTab = "perfil",
}: {
  perfil: React.ReactNode;
  historico: React.ReactNode;
  defaultTab?: ClientProfileTab;
}) {
  const [tab, setTab] = useState<ClientProfileTab>(defaultTab);

  const tabs: { id: ClientProfileTab; label: string }[] = [
    { id: "perfil", label: "Perfil" },
    { id: "historico", label: "Histórico" },
  ];

  return (
    <div className="space-y-4">
      <div
        className="flex gap-0 border-b border-border"
        role="tablist"
        aria-label="Seções do cliente"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.id
                ? "text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary"
                : "text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel">{tab === "perfil" ? perfil : historico}</div>
    </div>
  );
}
