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
  role: "ADV" | "GERENTE" | "COLABORADOR";
  team: { id: string; name: string } | null;
};

export function AdminUsersPanel({ teams }: { teams: TeamOption[] }) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [filterTeamId, setFilterTeamId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADV" | "GERENTE" | "COLABORADOR">("COLABORADOR");
  const [teamId, setTeamId] = useState("");
  const [saving, setSaving] = useState(false);

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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!teamId) {
      setError("Selecione uma equipe.");
      return;
    }
    setSaving(true);
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
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="industrial-panel space-y-4 p-6">
        <div className="flex items-center gap-2">
          <Icon name="userPlus" className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-semibold">Novo usuário</h2>
        </div>
        <p className="text-xs text-muted">
          Admin pode criar ADV, Gerente ou Colaborador em qualquer equipe.
        </p>

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
            </SelectField>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Nome *</label>
              <input
                className="industrial-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Email (login) *</label>
              <input
                type="email"
                className="industrial-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted">Senha inicial *</label>
              <input
                type="password"
                className="industrial-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <button type="submit" className="btn-primary" disabled={saving}>
                <Icon name="plus" className="h-4 w-4" />
                {saving ? "Salvando..." : "Criar usuário"}
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="industrial-panel p-4">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-2">
            <Icon name="users" className="h-5 w-5 text-muted" />
            <h3 className="text-sm font-semibold">Usuários do sistema</h3>
          </div>
          <SelectField
            label="Filtrar equipe"
            value={filterTeamId}
            onChange={setFilterTeamId}
            className="min-w-[200px]"
          >
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
              <li key={u.id} className="flex flex-wrap justify-between gap-2 py-3">
                <div>
                  <p className="font-medium">{u.name}</p>
                  <p className="text-xs text-muted">{u.email}</p>
                </div>
                <div className="text-right text-xs text-muted">
                  <p>{ROLE_LABELS[u.role]}</p>
                  <p>{u.team?.name ?? "—"}</p>
                </div>
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
