"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { TeamMembersManager } from "@/components/TeamMembersManager";
import { TeseManager } from "@/components/TeseManager";
import { KanbanColumnManager } from "@/components/KanbanColumnManager";
import type { KanbanColumnItem } from "@/lib/kanban-columns";

export default function EquipePage() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [columns, setColumns] = useState<KanbanColumnItem[]>([]);

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
      .then((d) => {
        if (d.columns) setColumns(d.columns);
      });
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
        <h1 className="text-xl font-semibold tracking-wide">Minha equipe</h1>
        <p className="mt-1 text-sm text-muted">
          {canInvite
            ? "Cadastre gerentes e colaboradores. Dados ficam isolados das outras equipes."
            : "Membros e teses da sua equipe."}
        </p>
      </div>

      <TeamMembersManager canInvite={canInvite} />

      {canInvite && (
        <div className="mt-8" id="teses">
          <h2 className="mb-4 text-sm font-medium">Teses da equipe</h2>
          <TeseManager />
        </div>
      )}

      {canManageColumns && teamId && (
        <div className="mt-8" id="kanban-colunas">
          <h2 className="mb-4 text-sm font-medium">Colunas do kanban</h2>
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
    </AppShell>
  );
}
