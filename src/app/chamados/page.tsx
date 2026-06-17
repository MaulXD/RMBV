"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ChamadoFormModal, type ChamadoFormValues } from "@/components/ChamadoFormModal";
import { PriorityBadge } from "@/components/PriorityBadge";
import type { ChamadoListItem } from "@/lib/chamado-fields";
import {
  CHAMADO_CATEGORY_LABELS,
  CHAMADO_STATUS_LABELS,
} from "@/lib/enum-labels";
import type { ChamadoCategory, ChamadoStatus } from "@prisma/client";
import { Icon } from "@/components/ui/Icon";

type Team = { id: string; name: string };
type Member = { id: string; name: string };

export default function ChamadosPage() {
  return (
    <AppShell>
      <ChamadosContent />
    </AppShell>
  );
}

function ChamadosContent() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState("");
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
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        const admin = d.user?.role === "ADMIN";
        setIsAdmin(admin);
        if (!admin && d.user?.teamId) setTeamId(d.user.teamId);
      });
  }, []);

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
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-wide">Chamados</h1>
          <p className="mt-1 text-sm text-muted">Bugs, sugestões e solicitações da equipe</p>
        </div>
        <button
          type="button"
          className="btn-primary"
          disabled={!teamId}
          onClick={() => setModalOpen(true)}
        >
          <Icon name="plus" className="h-4 w-4" />
          Novo chamado
        </button>
      </div>

      <section className="panel-solid mb-4 flex flex-wrap items-end gap-3 p-4">
        {isAdmin && (
          <div className="min-w-[180px]">
            <label className="mb-1 block text-xs text-muted">Equipe</label>
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
        <div className="min-w-[160px] flex-1">
          <label className="mb-1 block text-xs text-muted">Buscar</label>
          <input
            className="industrial-input w-full"
            placeholder="Título ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="min-w-[140px]">
          <label className="mb-1 block text-xs text-muted">Status</label>
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
        <div className="min-w-[130px]">
          <label className="mb-1 block text-xs text-muted">Categoria</label>
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
        <div className="min-w-[120px]">
          <label className="mb-1 block text-xs text-muted">Prioridade</label>
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
        <div className="min-w-[150px]">
          <label className="mb-1 block text-xs text-muted">Responsável</label>
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
        <label className="flex items-center gap-2 pb-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={showClosed}
            onChange={(e) => setShowClosed(e.target.checked)}
          />
          Mostrar fechados
        </label>
      </section>

      {!teamId ? (
        <div className="panel-solid p-8 text-center text-sm text-muted">
          {isAdmin ? "Selecione uma equipe." : "Você não está vinculado a uma equipe."}
        </div>
      ) : loading ? (
        <div className="panel-solid p-8 text-center text-sm text-muted">Carregando...</div>
      ) : chamados.length === 0 ? (
        <div className="panel-solid p-8 text-center text-sm text-muted">Nenhum chamado encontrado.</div>
      ) : (
        <div className="panel-solid overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Título</th>
                <th className="hidden px-4 py-3 md:table-cell">Categoria</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Prioridade</th>
                <th className="hidden px-4 py-3 lg:table-cell">Responsável</th>
                <th className="hidden px-4 py-3 sm:table-cell">Atualizado</th>
              </tr>
            </thead>
            <tbody>
              {chamados.map((c) => (
                <tr
                  key={c.id}
                  className="cursor-pointer border-b border-border/50 hover:bg-surface/80"
                  onClick={() => router.push(`/chamados/${c.id}`)}
                >
                  <td className="px-4 py-3 font-mono text-xs text-muted">#{c.number}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{c.title}</p>
                    <p className="text-xs text-muted">{c.requester.name}</p>
                  </td>
                  <td className="hidden px-4 py-3 text-muted md:table-cell">
                    {CHAMADO_CATEGORY_LABELS[c.category]}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-surface px-2 py-0.5 text-xs">
                      {CHAMADO_STATUS_LABELS[c.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <PriorityBadge priority={c.priority} />
                  </td>
                  <td className="hidden px-4 py-3 text-muted lg:table-cell">
                    {c.assignee?.name ?? "—"}
                  </td>
                  <td className="hidden px-4 py-3 text-muted sm:table-cell">
                    {new Date(c.updatedAt).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
