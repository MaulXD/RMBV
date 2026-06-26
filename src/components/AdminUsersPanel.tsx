"use client";

import { useCallback, useEffect, useState } from "react";
import { ROLE_LABELS } from "@/lib/roles";
import { Icon } from "./ui/Icon";
import { SelectField } from "./ui/SelectField";

type TeamOption = { id: string; name: string };

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "ADV" | "GERENTE" | "COLABORADOR" | "PESQUISADOR";
  isActive: boolean;
  team: { id: string; name: string } | null;
};

export function AdminUsersPanel({ teams }: { teams: TeamOption[] }) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [filterTeamId, setFilterTeamId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    role: "COLABORADOR" as UserRow["role"],
    teamId: "",
    isActive: true,
    password: "",
  });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADV" | "GERENTE" | "COLABORADOR" | "PESQUISADOR">("COLABORADOR");
  const [teamId, setTeamId] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (teams[0] && !teamId) setTeamId(teams[0].id);
  }, [teams, teamId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = filterTeamId ? `?teamId=${filterTeamId}` : "";
      const res = await fetch(`/api/admin/users${qs}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao carregar usuários");
      setUsers(data.users ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  }, [filterTeamId]);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(user: UserRow) {
    setEditingId(user.id);
    setEditForm({
      name: user.name,
      email: user.email,
      role: user.role,
      teamId: user.team?.id ?? "",
      isActive: user.isActive,
      password: "",
    });
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
        teamId: editForm.teamId,
        isActive: editForm.isActive,
      };
      if (editForm.password.trim()) body.password = editForm.password.trim();

      const res = await fetch(`/api/admin/users/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao salvar");
      setEditingId(null);
      setMessage("Usuário atualizado.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(userId: string) {
    if (!confirm("Tem certeza que deseja excluir este usuário? Esta ação é irreversível.")) return;
    setDeletingId(userId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao excluir");
      setMessage("Usuário excluído.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!teamId) {
      setError("Selecione uma equipe.");
      return;
    }
    setCreating(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role, teamId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao cadastrar");
      setName("");
      setEmail("");
      setPassword("");
      const roleLabel =
        data.user?.role && data.user.role in ROLE_LABELS
          ? ROLE_LABELS[data.user.role as keyof typeof ROLE_LABELS]
          : "Usuário";
      setMessage(`${roleLabel} criado com sucesso.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="industrial-panel space-y-4 p-6">
        <div className="flex items-center gap-2">
          <Icon name="userPlus" className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-semibold">Novo usuário</h2>
        </div>

        {teams.length === 0 ? (
          <p className="alert alert-warn">Crie uma equipe antes de cadastrar usuários.</p>
        ) : (
          <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2">
            <SelectField label="Equipe *" value={teamId} onChange={setTeamId} required>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </SelectField>
            <SelectField label="Papel *" value={role} onChange={(v) => setRole(v as typeof role)}>
              <option value="ADV">ADV</option>
              <option value="GERENTE">Gerente</option>
              <option value="COLABORADOR">Colaborador</option>
              <option value="PESQUISADOR">Pesquisador</option>
            </SelectField>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Nome *</label>
              <input className="industrial-input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Login *</label>
              <input className="industrial-input" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted">Senha inicial *</label>
              <input type="password" className="industrial-input" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <button type="submit" className="btn-primary" disabled={creating}>
                {creating ? "Salvando..." : "Criar usuário"}
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="industrial-panel p-4">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h3 className="text-sm font-semibold">Usuários do sistema</h3>
          <SelectField label="Filtrar equipe" value={filterTeamId} onChange={setFilterTeamId} className="min-w-[200px]">
            <option value="">Todas</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </SelectField>
        </div>

        {loading ? (
          <p className="text-sm text-muted">Carregando...</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted">Nenhum usuário.</p>
        ) : (
          <ul className="divide-y divide-border">
            {users.map((u) => (
              <li key={u.id} className="py-3">
                {editingId === u.id ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input className="industrial-input" value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
                    <input className="industrial-input" value={editForm.email} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} autoComplete="username" />
                    <select className="industrial-input" value={editForm.role} onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value as UserRow["role"] }))}>
                      <option value="ADV">ADV</option>
                      <option value="GERENTE">Gerente</option>
                      <option value="COLABORADOR">Colaborador</option>
                      <option value="PESQUISADOR">Pesquisador</option>
                    </select>
                    <select className="industrial-input" value={editForm.teamId} onChange={(e) => setEditForm((p) => ({ ...p, teamId: e.target.value }))}>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    <input className="industrial-input sm:col-span-2" type="password" placeholder="Nova senha (opcional)" value={editForm.password} onChange={(e) => setEditForm((p) => ({ ...p, password: e.target.value }))} />
                    <label className="flex items-center gap-2 text-sm sm:col-span-2">
                      <input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm((p) => ({ ...p, isActive: e.target.checked }))} />
                      Usuário ativo
                    </label>
                    <div className="flex gap-2 sm:col-span-2">
                      <button type="button" className="btn-primary" disabled={saving} onClick={() => void saveEdit()}>Salvar</button>
                      <button type="button" className="btn-ghost" onClick={() => setEditingId(null)}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">
                        {u.name}
                        {!u.isActive && <span className="ml-2 text-xs text-red-500">(inativo)</span>}
                      </p>
                      <p className="text-xs text-muted">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-3 text-right text-xs text-muted">
                      <div>
                        <p>{ROLE_LABELS[u.role]}</p>
                        <p>{u.team?.name ?? "—"}</p>
                      </div>
                      <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => startEdit(u)}>
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === u.id}
                        onClick={() => void handleDelete(u.id)}
                        className="btn-ghost px-2 py-1 text-xs text-red-500 hover:text-red-600 disabled:opacity-50"
                      >
                        {deletingId === u.id ? "..." : <Icon name="trash" className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {error && <p className="alert alert-error">{error}</p>}
      {message && <p className="alert alert-success">{message}</p>}
    </div>
  );
}
