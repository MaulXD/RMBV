"use client";

import { useState } from "react";
import { useSession } from "@/components/SessionProvider";
import { SelfServicePonto } from "@/components/ponto/SelfServicePonto";
import { AdminPontoView } from "@/components/ponto/AdminPontoView";

export default function PontoPage() {
  const { user } = useSession();
  const [mobileTab, setMobileTab] = useState<"mine" | "team">("mine");
  if (!user) return null;

  const canSelfPunch = user.role !== "ADMIN";
  const canManageTeam = user.role === "ADMIN" || user.role === "ADV" || user.role === "GERENTE";

  if (!canSelfPunch) return <AdminPontoView user={user} />;

  if (canManageTeam) {
    return (
      <>
        <div className="app-tabs lg:hidden">
          <button
            type="button"
            className={`app-tab ${mobileTab === "mine" ? "app-tab-active" : ""}`}
            onClick={() => setMobileTab("mine")}
          >
            Meu ponto
          </button>
          <button
            type="button"
            className={`app-tab ${mobileTab === "team" ? "app-tab-active" : ""}`}
            onClick={() => setMobileTab("team")}
          >
            Equipe
          </button>
        </div>
        <div className="lg:hidden">
          {mobileTab === "mine" ? (
            <SelfServicePonto user={user} />
          ) : (
            <AdminPontoView user={user} embedded />
          )}
        </div>
        <div className="hidden space-y-8 lg:block">
          <SelfServicePonto user={user} />
          <AdminPontoView user={user} embedded />
        </div>
      </>
    );
  }

  return <SelfServicePonto user={user} />;
}
