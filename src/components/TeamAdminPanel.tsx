"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "./ui/Icon";

type TeamRow = {
  id: string;
  name: string;
  isActive: boolean;
  owner: { id: string; name: string; email: string; role: string } | null;
  _count: { members: number; clients: number; teses: number };
};

export function TeamAdminPanel({
  onTeamsChange,
}: {
  onTeamsChange?: (teams: { id: string; name: string }[]) => void;
}) {
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [withAdv, setWithAdv] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/teams");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao carregar equipes");
      const list = data.teams ?? [];
      setTeams(list);
      onTeamsChange?.(list.map((t: TeamRow) => ({ id: t.id, name: t.name })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  }, [onTeamsChange]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          ...(withAdv ? { ownerName, ownerEmail, ownerPassword } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao criar equipe");
      setName("");
      setOwnerName("");
      setOwnerEmail("");
      setOwnerPassword("");
      setMessage(`Equipe "${data.team.name}" criada.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(team: TeamRow) {
    setEditingId(team.id);
    setEditName(team.name);
    setEditActive(team.isActive);
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/teams/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, isActive: editActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao salvar");
      setEditingId(null);
      setMessage("Equipe atualizada.");
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
          <Icon name="building" className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-semibold">Nova equipe</h2>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Nome da equipe *</label>
            <input className="industrial-input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={withAdv} onChange={(e) => setWithAdv(e.target.checked)} className="h-4 w-4 accent-primary" />
            Criar ADV responsável agora
          </label>
          {withAdv && (
            <div className="grid gap-3 rounded-[var(--radius-ui)] border border-border bg-surface-elevated p-4 sm:grid-cols-2">
              <input className="industrial-input" placeholder="Nome do ADV" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required={withAdv} />
              <input className="industrial-input" placeholder="Login do ADV (ex.: VMMadv)" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} required={withAdv} autoComplete="username" />
              <input className="industrial-input sm:col-span-2" type="password" placeholder="Senha inicial" value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)} minLength={6} required={withAdv} />
            </div>
          )}
          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={creating}>
              {creating ? "Criando..." : "Criar equipe"}
            </button>
          </div>
        </form>
      </section>

      <section className="industrial-panel p-4">
        <h3 className="mb-4 text-sm font-semibold">Equipes cadastradas</h3>
        {loading ? (
          <p className="text-sm text-muted">Carregando...</p>
        ) : teams.length === 0 ? (
          <p className="text-sm text-muted">Nenhuma equipe.</p>
        ) : (
          <ul className="divide-y divide-border">
            {teams.map((t) => (
              <li key={t.id} className="py-3">
                {editingId === t.id ? (
                  <div className="space-y-3">
                    <input className="industrial-input" value={editName} onChange={(e) => setEditName(e.target.value)} />
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} />
                      Equipe ativa
                    </label>
                    <div className="flex gap-2">
                      <button type="button" className="btn-primary" disabled={saving} onClick={() => void saveEdit()}>Salvar</button>
                      <button type="button" className="btn-ghost" onClick={() => setEditingId(null)}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">
                        {t.name}
                        {!t.isActive && <span className="ml-2 text-xs text-red-500">(inativa)</span>}
                      </p>
                      <p className="text-xs text-muted">
                        {t.owner ? `ADV: ${t.owner.name}` : "Sem ADV"} · {t._count.members} membro(s) · {t._count.clients} cliente(s)
                      </p>
                    </div>
                    <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => startEdit(t)}>
                      Editar
                    </button>
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
