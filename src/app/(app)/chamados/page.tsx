"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/SessionProvider";
import { ChamadoFormModal, type ChamadoFormValues } from "@/components/ChamadoFormModal";
import { ChamadoListCard } from "@/components/ChamadoListCard";
import { CategoryBadge } from "@/components/CategoryBadge";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { PriorityBadge } from "@/components/PriorityBadge";
import { ChamadoStatusBadge } from "@/components/ChamadoStatusBadge";
import type { ChamadoListItem } from "@/lib/chamado-fields";
import type { ChamadoCategory, ChamadoStatus } from "@prisma/client";
import { CHAMADO_CATEGORY_LABELS, CHAMADO_STATUS_LABELS } from "@/lib/enum-labels";
import { Icon } from "@/components/ui/Icon";
import { SkeletonTable } from "@/components/ui/Skeleton";

type Team = { id: string; name: string };
type Member = { id: string; name: string };

export default function ChamadosPage() {
  return <ChamadosContent />;
}

function ChamadosContent() {
  const router = useRouter();
  const { user } = useSession();
  const isAdmin = user?.role === "ADMIN";
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState(() => (!isAdmin ? (user?.teamId ?? "") : ""));
  const [members, setMembers] = useState<Member[]>([]);
  const [chamados, setChamados] = useState<ChamadoListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [showClosed, setShowClosed] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isAdmin && user?.teamId && !teamId) setTeamId(user.teamId);
  }, [user, isAdmin, teamId]);

  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/teams")
      .then((r) => r.json())
      .then((d) => {
        const list = (d.teams ?? []) as Team[];
        setTeams(list);
        if (list[0] && !teamId) setTeamId(list[0].id);
      });
  }, [isAdmin, teamId]);

  const loadMembers = useCallback(async () => {
    if (!teamId) return;
    const res = await fetch(`/api/tasks/assignees?teamId=${teamId}`);
    const data = await res.json();
    if (res.ok) setMembers(data.members ?? []);
  }, [teamId]);

  const loadChamados = useCallback(async () => {
    if (!teamId) {
      setChamados([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ teamId });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (priorityFilter !== "all") params.set("priority", priorityFilter);
      if (assigneeFilter) params.set("assigneeId", assigneeFilter);
      if (showClosed) params.set("showClosed", "1");
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/chamados?${params}`);
      const data = await res.json();
      if (res.ok) setChamados(data.chamados ?? []);
    } finally {
      setLoading(false);
    }
  }, [teamId, statusFilter, categoryFilter, priorityFilter, assigneeFilter, showClosed, search]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    void loadChamados();
  }, [loadChamados]);

  async function createChamado(values: ChamadoFormValues) {
    if (!teamId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/chamados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: values.title,
          description: values.description || null,
          category: values.category,
          priority: values.priority,
          assigneeId: values.assigneeId || null,
          clientId: values.clientId || null,
          teamId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao criar");
      setModalOpen(false);
      router.push(`/chamados/${data.chamado.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        icon="ticket"
        title="Chamados"
        subtitle="Bugs, sugestões e solicitações — acompanhe o pipeline da equipe"
        actions={
          <button
            type="button"
            className="btn-primary"
            disabled={!teamId}
            onClick={() => setModalOpen(true)}
          >
            <Icon name="plus" className="h-4 w-4" />
            Novo chamado
          </button>
        }
      />

      <section className="filter-bar">
        {isAdmin && (
          <div className="min-w-[140px]">
            <label className="text-muted">Equipe</label>
            <select
              className="industrial-input w-full"
              value={teamId}
              onChange={(e) => {
                setTeamId(e.target.value);
                setAssigneeFilter("");
              }}
            >
              <option value="">Selecione...</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="min-w-[140px] flex-1">
          <label className="text-muted">Buscar</label>
          <input
            className="industrial-input w-full"
            placeholder="Título ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="min-w-[120px]">
          <label className="text-muted">Status</label>
          <select
            className="industrial-input w-full"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Abertos</option>
            {(Object.keys(CHAMADO_STATUS_LABELS) as ChamadoStatus[]).map((s) => (
              <option key={s} value={s}>
                {CHAMADO_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[110px]">
          <label className="text-muted">Categoria</label>
          <select
            className="industrial-input w-full"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">Todas</option>
            {(Object.keys(CHAMADO_CATEGORY_LABELS) as ChamadoCategory[]).map((c) => (
              <option key={c} value={c}>
                {CHAMADO_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[100px]">
          <label className="text-muted">Prioridade</label>
          <select
            className="industrial-input w-full"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="all">Todas</option>
            <option value="ALTA">Alta</option>
            <option value="MEDIA">Média</option>
            <option value="BAIXA">Baixa</option>
          </select>
        </div>
        <div className="min-w-[120px]">
          <label className="text-muted">Responsável</label>
          <select
            className="industrial-input w-full"
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
        <label className="flex items-center gap-1.5 pb-1.5 text-[11px] text-muted">
          <input
            type="checkbox"
            checked={showClosed}
            onChange={(e) => setShowClosed(e.target.checked)}
          />
          Fechados
        </label>
      </section>

      {!teamId ? (
        <EmptyState
          icon="building"
          title="Selecione uma equipe"
          description={isAdmin ? "Escolha a equipe para listar os chamados." : "Você não está vinculado a uma equipe."}
        />
      ) : loading ? (
        <SkeletonTable rows={6} cols={5} />
      ) : chamados.length === 0 ? (
        <EmptyState
          icon="ticket"
          title="Nenhum chamado encontrado"
          description="Abra um novo chamado para reportar bugs, sugestões ou solicitações."
          action={
            <button type="button" className="btn-primary" onClick={() => setModalOpen(true)}>
              <Icon name="plus" className="h-4 w-4" />
              Novo chamado
            </button>
          }
        />
      ) : (
        <>
          <div className="grid gap-2 md:hidden">
            {chamados.map((c) => (
              <ChamadoListCard
                key={c.id}
                chamado={c}
                onClick={() => router.push(`/chamados/${c.id}`)}
              />
            ))}
          </div>

          <div className="soft-card hidden overflow-hidden md:block">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Título</th>
                  <th>Categoria</th>
                  <th>Status</th>
                  <th>Prioridade</th>
                  <th className="hidden lg:table-cell">Responsável</th>
                  <th className="hidden sm:table-cell">Atualizado</th>
                </tr>
              </thead>
              <tbody>
                {chamados.map((c) => (
                  <tr key={c.id} onClick={() => router.push(`/chamados/${c.id}`)}>
                    <td className="font-mono text-[11px] font-bold text-primary">#{c.number}</td>
                    <td>
                      <p className="font-medium">{c.title}</p>
                      <p className="text-[11px] text-muted">{c.requester.name}</p>
                    </td>
                    <td>
                      <CategoryBadge category={c.category} />
                    </td>
                    <td>
                      <ChamadoStatusBadge status={c.status} />
                    </td>
                    <td>
                      <PriorityBadge priority={c.priority} />
                    </td>
                    <td className="hidden text-muted lg:table-cell">{c.assignee?.name ?? "—"}</td>
                    <td className="hidden text-[11px] text-muted sm:table-cell">
                      {new Date(c.updatedAt).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <ChamadoFormModal
        open={modalOpen}
        teamId={teamId}
        members={members}
        saving={saving}
        onClose={() => setModalOpen(false)}
        onSave={createChamado}
      />
    </>
  );
}
