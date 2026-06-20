"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/components/SessionProvider";
import { ReportsGoalsPanel } from "@/components/ReportsGoalsPanel";
import { ReportsTimelineChart } from "@/components/ReportsTimelineChart";
import { MonthlyReportPanel } from "@/components/MonthlyReportPanel";
import { ResearchReportPanel } from "@/components/ResearchReportPanel";
import { CollaboratorsReportPanel } from "@/components/CollaboratorsReportPanel";
import { useTeseFilter } from "@/components/TeseFilterProvider";
import { TeseFilterBar } from "@/components/TeseFilterBar";
import { STATUS_OPTIONS } from "@/lib/client-fields";

type Tab = "geral" | "mensal" | "pesquisa" | "colaboradores";

type Stats = {
  total: number;
  byStatus: { status: string; label: string; count: number }[];
};

type TimelinePoint = {
  monthKey: string;
  label: string;
  created: number;
  finalized: number;
  localized: number;
};

type Member = { id: string; name: string; role: string };

const METRIC_STYLES: Record<
  string,
  { valueClass: string; accentBorder: boolean; barClass: string }
> = {
  total: {
    valueClass: "text-primary",
    accentBorder: true,
    barClass: "bg-primary",
  },
  AGUARDANDO: {
    valueClass: "text-muted",
    accentBorder: false,
    barClass: "bg-slate-400",
  },
  LOCALIZADO: {
    valueClass: "text-emerald-600 dark:text-emerald-400",
    accentBorder: false,
    barClass: "bg-emerald-400",
  },
  SEM_SUCESSO: {
    valueClass: "text-red-600 dark:text-red-400",
    accentBorder: false,
    barClass: "bg-red-400",
  },
  TENTE_NOVAMENTE: {
    valueClass: "text-amber-700 dark:text-amber-400",
    accentBorder: false,
    barClass: "bg-amber-400",
  },
};

function ReportsContent() {
  const { activeTeseId, activeTese } = useTeseFilter();
  const { user } = useSession();
  const userRole = user?.role ?? null;
  const userTeamId = user?.teamId ?? null;
  const [tab, setTab] = useState<Tab>("geral");
  const [stats, setStats] = useState<Stats | null>(null);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [teses, setTeses] = useState<{ id: string; name: string }[]>([]);
  const [teamId, setTeamId] = useState(() => user?.teamId ?? "");
  const [members, setMembers] = useState<Member[]>([]);
  const [assigneeFilter, setAssigneeFilter] = useState("");

  const isAdmin = userRole === "ADMIN";
  const canManageGoals = userRole === "ADMIN" || userRole === "ADV" || userRole === "GERENTE";
  const effectiveTeamId = teamId;

  useEffect(() => {
    if (!isAdmin && user?.teamId && !teamId) setTeamId(user.teamId);
  }, [user, isAdmin, teamId]);

  useEffect(() => {
    fetch("/api/teses")
      .then((r) => r.json())
      .then((d) => setTeses((d.teses ?? []).map((t: { id: string; name: string }) => ({ id: t.id, name: t.name }))));
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/teams")
      .then((r) => r.json())
      .then((d) => {
        const list = (d.teams ?? []).map((t: { id: string; name: string }) => ({
          id: t.id,
          name: t.name,
        }));
        setTeams(list);
        if (list[0] && !teamId) setTeamId(list[0].id);
      });
  }, [isAdmin, teamId]);

  const loadMembers = useCallback(async () => {
    if (!effectiveTeamId) return;
    if (isAdmin) {
      const res = await fetch(`/api/admin/users?teamId=${effectiveTeamId}`);
      const data = await res.json();
      if (res.ok) {
        setMembers(
          (data.users ?? []).map((u: Member) => ({
            id: u.id,
            name: u.name,
            role: u.role,
          }))
        );
      }
      return;
    }
    const res = await fetch("/api/teams/members");
    const data = await res.json();
    if (res.ok) {
      setMembers(data.members ?? []);
    }
  }, [effectiveTeamId, isAdmin]);

  const loadStats = useCallback(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (activeTeseId) params.set("teseId", activeTeseId);
    const qs = params.toString() ? `?${params}` : "";
    fetch(`/api/reports/stats${qs}`)
      .then((r) => r.json())
      .then((d) => setStats(d));
  }, [statusFilter, activeTeseId]);

  const loadTimeline = useCallback(() => {
    const params = new URLSearchParams({ months: "12" });
    if (activeTeseId) params.set("teseId", activeTeseId);
    if (isAdmin && teamId) params.set("teamId", teamId);
    if (assigneeFilter) params.set("assigneeId", assigneeFilter);
    fetch(`/api/reports/timeline?${params}`)
      .then((r) => r.json())
      .then((d) => setTimeline(d.timeline ?? []));
  }, [activeTeseId, isAdmin, teamId, assigneeFilter]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadTimeline();
  }, [loadTimeline]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  function exportUrl(kind: "clients" | "tasks", format: "csv" | "pdf") {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (activeTeseId) params.set("teseId", activeTeseId);
    if (isAdmin && teamId) params.set("teamId", teamId);
    const qs = params.toString() ? `?${params}` : "";
    if (kind === "tasks") return `/api/reports/export-tasks${qs}`;
    return format === "csv" ? `/api/reports/export${qs}` : `/api/reports/pdf${qs}`;
  }

  const total = stats?.total ?? 0;

  return (
    <>
      <div className="page-header mb-5">
        <div>
          <h1 className="page-title">Relatórios</h1>
          <p className="page-subtitle">Resumo geral da equipe</p>
        </div>
        <TeseFilterBar embedded showPdfButton />
      </div>

      <div className="app-tabs">
        {([
          { key: "geral", label: "Visão geral" },
          { key: "mensal", label: "Relatório mensal" },
          { key: "pesquisa", label: "Pesquisa" },
          { key: "colaboradores", label: "Colaboradores" },
        ] as { key: Tab; label: string }[]).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`app-tab ${tab === t.key ? "app-tab-active" : ""}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "mensal" && (
        <MonthlyReportPanel
          teams={teams}
          teses={teses}
          userRole={userRole ?? "COLABORADOR"}
          userTeamId={userTeamId}
        />
      )}

      {tab === "pesquisa" && (
        <ResearchReportPanel
          teams={teams}
          userRole={userRole ?? "COLABORADOR"}
          userTeamId={userTeamId}
        />
      )}

      {tab === "colaboradores" && (
        <CollaboratorsReportPanel
          teams={teams}
          userRole={userRole ?? "COLABORADOR"}
          userTeamId={userTeamId}
        />
      )}

      {tab === "geral" && (
      <>

      {(isAdmin || members.length > 0) && (
        <section className="panel-solid mb-6 flex flex-wrap items-end gap-3 p-4">
          {isAdmin && teams.length > 0 && (
            <div className="min-w-[180px]">
              <label className="mb-1 block text-xs text-muted">Equipe</label>
              <select
                className="industrial-input"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="min-w-[180px]">
            <label className="mb-1 block text-xs text-muted">Filtrar por membro</label>
            <select
              className="industrial-input"
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
            >
              <option value="">Todos</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </section>
      )}

      {timeline.length > 0 && (
        <div className="mb-6">
          <ReportsTimelineChart timeline={timeline} />
        </div>
      )}

      {effectiveTeamId && (
        <div className="mb-6">
          <ReportsGoalsPanel
            teamId={effectiveTeamId}
            canManage={canManageGoals}
            members={members}
          />
        </div>
      )}

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <div className="panel-solid stat-card-base stat-card-primary">
            <span className="text-[11px] font-semibold tracking-widest text-muted uppercase">
              Total
            </span>
            <span className={`text-3xl leading-none font-extrabold ${METRIC_STYLES.total.valueClass}`}>
              {total.toLocaleString("pt-BR")}
            </span>
          </div>

          {stats.byStatus.map((item) => {
            const style = METRIC_STYLES[item.status] ?? METRIC_STYLES.AGUARDANDO;
            const pct = total > 0 ? (item.count / total) * 100 : 0;
            return (
              <div key={item.status} className="panel-solid flex flex-col gap-2 p-5">
                <span className="text-[11px] font-semibold tracking-widest text-muted uppercase">
                  {item.label}
                </span>
                <span className={`text-3xl leading-none font-extrabold ${style.valueClass}`}>
                  {item.count.toLocaleString("pt-BR")}
                </span>
                <div className="mt-1 h-0.5 overflow-hidden rounded-full bg-border">
                  <div
                    className={`h-full rounded-full opacity-50 transition-all duration-500 ${style.barClass}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <section className="panel-solid max-w-lg space-y-4 p-5">
        <h2 className="font-semibold text-foreground">Exportar dados</h2>
        <p className="text-sm text-muted">
          Exportações respeitam a tese ativa, equipe e filtros abaixo. CSV abre no Excel.
        </p>

        <div>
          <label className="mb-1 block text-xs text-muted">Filtrar por status (opcional)</label>
          <select
            className="industrial-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Todos</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          <a href={exportUrl("clients", "csv")} className="btn-ghost">
            Clientes (Excel/CSV)
          </a>
          <a href={exportUrl("tasks", "csv")} className="btn-ghost">
            Tarefas (Excel/CSV)
          </a>
          <a href={exportUrl("clients", "pdf")} className="btn-primary" target="_blank" rel="noreferrer">
            Relatório PDF
          </a>
        </div>
      </section>
      </>
      )}
    </>
  );
}

export default function ReportsPage() {
  return <ReportsContent />;
}
