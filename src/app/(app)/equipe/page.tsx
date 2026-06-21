"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/SessionProvider";
import { TeamMembersManager } from "@/components/TeamMembersManager";
import { TeseManager } from "@/components/TeseManager";
import { KanbanColumnManager } from "@/components/KanbanColumnManager";
import { AccessControlPanel } from "@/components/AccessControlPanel";
import { TeamFaceEnrollmentPanel } from "@/components/TeamFaceEnrollmentPanel";
import type { KanbanColumnItem } from "@/lib/kanban-columns";

const SECTIONS = [
  { id: "teses", label: "Teses" },
  { id: "membros", label: "Membros" },
  { id: "kanban", label: "Kanban" },
  { id: "acesso", label: "Acesso" },
  { id: "ponto", label: "Ponto facial" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

type Member = { id: string; name: string; role: string; isActive: boolean };

export default function EquipePage() {
  const router = useRouter();
  const { user } = useSession();
  const role = user?.role ?? null;
  const teamId = user?.teamId ?? null;
  const [columns, setColumns] = useState<KanbanColumnItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [activeSection, setActiveSection] = useState<SectionId>("teses");

  useEffect(() => {
    if (user === undefined) return;
    if (!user || user.role === "ADMIN") {
      router.replace("/admin");
    }
  }, [user, router]);

  useEffect(() => {
    if (!teamId) return;
    fetch(`/api/kanban/columns?teamId=${teamId}`)
      .then((r) => r.json())
      .then((d) => { if (d.columns) setColumns(d.columns); });
    fetch(`/api/teams/members`)
      .then((r) => r.json())
      .then((d) => { if (d.members) setMembers(d.members); });
  }, [teamId]);

  if (!role || role === "ADMIN") {
    return <p className="text-sm text-muted">Carregando...</p>;
  }

  const canInvite = role === "ADV";
  const canManageColumns = role === "ADV" || role === "GERENTE";

  return (
    <>
      <div className="mb-5">
        <h1 className="page-title">Configurações</h1>
        <p className="page-subtitle">Gerencie teses, membros da equipe e colunas do Kanban.</p>
      </div>

      <div className="app-tabs">
        {SECTIONS.filter((s) => s.id !== "ponto" || canInvite).map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActiveSection(s.id)}
            className={`app-tab ${activeSection === s.id ? "app-tab-active" : ""}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {activeSection === "teses" && (
        <div id="teses">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-foreground">Teses da equipe</h2>
            <p className="mt-0.5 text-xs text-muted">
              {canInvite
                ? "Adicione, edite ou remova teses. Clientes vinculados são migrados ao remover."
                : "Visualize as teses da sua equipe."}
            </p>
          </div>
          <TeseManager />
        </div>
      )}

      {activeSection === "membros" && (
        <div id="membros">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-foreground">Membros da equipe</h2>
            <p className="mt-0.5 text-xs text-muted">
              {canInvite
                ? "Cadastre e gerencie gerentes e colaboradores da equipe."
                : "Membros da sua equipe."}
            </p>
          </div>
          <TeamMembersManager canInvite={canInvite} />
        </div>
      )}

      {activeSection === "kanban" && canManageColumns && teamId && (
        <div id="kanban-colunas">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-foreground">Colunas do Kanban</h2>
            <p className="mt-0.5 text-xs text-muted">
              Configure as colunas do board da sua equipe.
            </p>
          </div>
          <KanbanColumnManager
            teamId={teamId}
            columns={columns}
            canManage={canManageColumns}
            onUpdated={async () => {
              const res = await fetch(`/api/kanban/columns?teamId=${teamId}`);
              const data = await res.json();
              if (res.ok) setColumns(data.columns ?? []);
            }}
          />
        </div>
      )}

      {activeSection === "kanban" && !canManageColumns && (
        <p className="text-sm text-muted">
          Apenas ADV e Gerente podem gerenciar colunas do Kanban.
        </p>
      )}

      {activeSection === "acesso" && (
        <div id="acesso">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-foreground">Controle de acesso</h2>
            <p className="mt-0.5 text-xs text-muted">
              Histórico de logins e restrições de horário por colaborador.
            </p>
          </div>
          <AccessControlPanel
            members={members}
            canEdit={canInvite}
            teamId={teamId}
          />
        </div>
      )}

      {activeSection === "ponto" && canInvite && teamId && (
        <div id="ponto-facial">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-foreground">Ponto facial</h2>
            <p className="mt-0.5 text-xs text-muted">
              Configure a localização do escritório, cadastre rostos e defina permissões do gerente.
            </p>
          </div>
          <TeamFaceEnrollmentPanel teamId={teamId} />
        </div>
      )}

      {activeSection === "ponto" && !canInvite && (
        <p className="text-sm text-muted">Apenas o ADV pode gerenciar cadastro facial da equipe.</p>
      )}
    </>
  );
}
