"use client";

import { useState } from "react";

export type ClientProfileTab = "perfil" | "pesquisa" | "historico";

export function ClientProfileTabs({
  perfil,
  pesquisa,
  historico,
  defaultTab = "perfil",
}: {
  perfil: React.ReactNode;
  pesquisa: React.ReactNode;
  historico: React.ReactNode;
  defaultTab?: ClientProfileTab;
}) {
  const [tab, setTab] = useState<ClientProfileTab>(defaultTab);

  const tabs: { id: ClientProfileTab; label: string }[] = [
    { id: "perfil", label: "Perfil" },
    { id: "pesquisa", label: "Pesquisa" },
    { id: "historico", label: "Histórico" },
  ];

  const panel =
    tab === "perfil" ? perfil : tab === "pesquisa" ? pesquisa : historico;

  return (
    <div className="space-y-0">
      <div
        className="flex gap-1 overflow-x-auto border-b border-border pb-px [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
            className={`shrink-0 rounded-t-[var(--radius-ui)] px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.id
                ? "border border-b-0 border-border bg-surface-elevated text-foreground"
                : "text-muted hover:bg-white/40 hover:text-foreground dark:hover:bg-white/5"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="pt-6" role="tabpanel">
        {panel}
      </div>
    </div>
  );
}
