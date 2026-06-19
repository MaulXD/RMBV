"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { TeamMembersManager } from "@/components/TeamMembersManager";
import { TeseManager } from "@/components/TeseManager";
import { KanbanColumnManager } from "@/components/KanbanColumnManager";
import { AccessControlPanel } from "@/components/AccessControlPanel";
import type { KanbanColumnItem } from "@/lib/kanban-columns";

const SECTIONS = [
  { id: "teses", label: "Teses" },
  { id: "membros", label: "Membros" },
  { id: "kanban", label: "Kanban" },
  { id: "acesso", label: "Acesso" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

type Member = { id: string; name: string; role: string; isActive: boolean };

export default function EquipePage() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [columns, setColumns] = useState<KanbanColumnItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [activeSection, setActiveSection] = useState<SectionId>("teses");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user || d.user.role === "ADMIN") {
          router.replace("/admin");
          return;
        }
        setRole(d.user.role);
        setTeamId(d.user.teamId ?? null);
      });
  }, [router]);

  useEffect(() => {
    if (!teamId) return;
    fetch(`/api/kanban/columns?teamId=${teamId}`)
      .then((r) => r.json())
      .then((d) => { if (d.columns) setColumns(d.columns); });
    fetch(`/api/teams/members`)
      .then((r) => r.json())
      .then((d) => { if (d.members) setMembers(d.members); });
  }, [teamId]);

  if (!role) {
    return (
      <AppShell>
        <p className="text-sm text-muted">Carregando...</p>
      </AppShell>
    );
  }

  const canInvite = role === "ADV";
  const canManageColumns = role === "ADV" || role === "GERENTE";

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Configurações</h1>
        <p className="mt-1 text-sm text-muted">
          Gerencie teses, membros da equipe e colunas do Kanban.
        </p>
      </div>

      {/* Section tabs */}
      <div className="mb-6 flex gap-1 border-b border-border">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActiveSection(s.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors -mb-px border-b-2 ${
              activeSection === s.id
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-foreground"
            }`}
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
    </AppShell>
  );
}
