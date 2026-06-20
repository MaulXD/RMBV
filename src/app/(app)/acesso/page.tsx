"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AccessControlPanel } from "@/components/AccessControlPanel";
import { useSession } from "@/components/SessionProvider";

type Member = { id: string; name: string; role: string; isActive: boolean };
type Team   = { id: string; name: string };

export default function AcessoPage() {
  const router = useRouter();
  const { user, loading } = useSession();
  const role   = user?.role ?? null;
  const isAdmin = role === "ADMIN";

  const [teams,          setTeams]          = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [members,        setMembers]        = useState<Member[]>([]);

  useEffect(() => {
    if (loading) return;
    if (!role || role === "COLABORADOR") router.replace("/dashboard");
  }, [loading, role, router]);

  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/teams")
      .then((r) => r.json())
      .then((d) => {
        const list = (d.teams ?? []) as Team[];
        setTeams(list);
        if (list[0] && !selectedTeamId) setSelectedTeamId(list[0].id);
      })
      .catch(() => {});
  }, [isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  const effectiveTeamId = isAdmin ? selectedTeamId : (user?.teamId ?? "");

  useEffect(() => {
    if (!effectiveTeamId) return;
    const endpoint = isAdmin
      ? `/api/teams/${effectiveTeamId}/members`
      : "/api/teams/members";
    fetch(endpoint)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.members)) setMembers(d.members); })
      .catch(() => {});
  }, [effectiveTeamId, isAdmin]);

  if (loading || !role || role === "COLABORADOR") {
    return <p className="text-sm text-muted">Carregando...</p>;
  }

  const canEdit = role === "ADV" || role === "ADMIN";

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Controle de acesso</h1>
          <p className="page-subtitle">Histórico de logins e restrições de horário por colaborador.</p>
        </div>

        {isAdmin && teams.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted">Equipe:</label>
            <select
              className="industrial-input"
              value={selectedTeamId}
              onChange={(e) => {
                setSelectedTeamId(e.target.value);
                setMembers([]);
              }}
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {effectiveTeamId ? (
        <AccessControlPanel
          members={members}
          canEdit={canEdit}
          teamId={effectiveTeamId}
        />
      ) : (
        <div className="panel-solid p-8 text-center text-sm text-muted">
          {isAdmin ? "Nenhuma equipe cadastrada." : "Você não está vinculado a uma equipe."}
        </div>
      )}
    </>
  );
}
