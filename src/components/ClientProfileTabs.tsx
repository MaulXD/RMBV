"use client";

import { useState } from "react";

export type ClientProfileTab = "perfil" | "pesquisa" | "revisao" | "historico" | "timeline" | "tarefas" | "parentes" | "acoes" | "whatsapp";

export function ClientProfileTabs({
  perfil,
  pesquisa,
  revisao,
  historico,
  timeline,
  tarefas,
  parentes,
  acoes,
  whatsapp,
  activeTab: controlledTab,
  onTabChange,
  defaultTab = "perfil",
}: {
  perfil: React.ReactNode;
  pesquisa: React.ReactNode;
  revisao: React.ReactNode;
  historico: React.ReactNode;
  timeline: React.ReactNode;
  tarefas: React.ReactNode;
  parentes: React.ReactNode;
  acoes?: React.ReactNode;
  whatsapp?: React.ReactNode;
  activeTab?: ClientProfileTab;
  onTabChange?: (tab: ClientProfileTab) => void;
  defaultTab?: ClientProfileTab;
}) {
  const [internalTab, setInternalTab] = useState<ClientProfileTab>(defaultTab);
  const tab = controlledTab ?? internalTab;

  function setTab(next: ClientProfileTab) {
    if (onTabChange) onTabChange(next);
    else setInternalTab(next);
  }

  const tabs: { id: ClientProfileTab; label: string }[] = [
    { id: "perfil", label: "Perfil" },
    { id: "pesquisa", label: "Pesquisa" },
    { id: "revisao", label: "Revisão" },
    { id: "parentes", label: "Parentes" },
    { id: "historico", label: "Histórico" },
    { id: "timeline", label: "Timeline de status" },
    { id: "tarefas", label: "Tarefas" },
    ...(acoes !== undefined ? [{ id: "acoes" as const, label: "Ações" }] : []),
    ...(whatsapp !== undefined ? [{ id: "whatsapp" as const, label: "WhatsApp" }] : []),
  ];

  const panel =
    tab === "perfil"
      ? perfil
      : tab === "pesquisa"
        ? pesquisa
        : tab === "revisao"
          ? revisao
          : tab === "parentes"
            ? parentes
            : tab === "tarefas"
              ? tarefas
              : tab === "timeline"
                ? timeline
                : tab === "acoes"
                  ? acoes
                  : tab === "whatsapp"
                    ? whatsapp
                    : historico;

  return (
    <div className="space-y-0">
      <div className="app-tabs" role="tablist" aria-label="Seções do cliente">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`app-tab ${tab === t.id ? "app-tab-active" : ""}`}
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
