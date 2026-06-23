"use client";

import { useState } from "react";

export type ClientProfileTab = "perfil" | "pesquisa" | "revisao" | "historico" | "tarefas" | "parentes" | "acoes";

export function ClientProfileTabs({
  perfil,
  pesquisa,
  revisao,
  historico,
  tarefas,
  parentes,
  acoes,
  activeTab: controlledTab,
  onTabChange,
  defaultTab = "perfil",
}: {
  perfil: React.ReactNode;
  pesquisa: React.ReactNode;
  revisao: React.ReactNode;
  historico: React.ReactNode;
  tarefas: React.ReactNode;
  parentes: React.ReactNode;
  acoes?: React.ReactNode;
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
    { id: "tarefas", label: "Tarefas" },
    ...(acoes !== undefined ? [{ id: "acoes" as const, label: "Ações" }] : []),
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
              : tab === "acoes"
                ? acoes
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
