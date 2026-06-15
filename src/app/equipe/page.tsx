"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { TeamMembersManager } from "@/components/TeamMembersManager";
import { TeseManager } from "@/components/TeseManager";

export default function EquipePage() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user || d.user.role === "ADMIN") {
          router.replace("/admin");
          return;
        }
        setRole(d.user.role);
      });
  }, [router]);

  if (!role) {
    return (
      <AppShell>
        <p className="text-sm text-muted">Carregando...</p>
      </AppShell>
    );
  }

  const canInvite = role === "ADV";

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
    </AppShell>
  );
}
