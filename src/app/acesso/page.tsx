"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { AccessControlPanel } from "@/components/AccessControlPanel";

type Member = { id: string; name: string; role: string; isActive: boolean };

export default function AcessoPage() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        const userRole = d.user?.role;
        if (!userRole || userRole === "COLABORADOR") {
          router.replace("/dashboard");
          return;
        }
        setRole(userRole);
        setTeamId(d.user.teamId ?? null);
      });
  }, [router]);

  useEffect(() => {
    if (!teamId) return;
    fetch("/api/teams/members")
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

  const canEdit = role === "ADV" || role === "ADMIN";

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Controle de acesso</h1>
        <p className="mt-1 text-sm text-muted">
          Histórico de logins e restrições de horário por colaborador.
        </p>
      </div>
      <AccessControlPanel members={members} canEdit={canEdit} teamId={teamId} />
    </AppShell>
  );
}
