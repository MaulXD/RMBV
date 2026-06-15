"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "./ui/Icon";

type TeamRow = {
  id: string;
  name: string;
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

  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [saving, setSaving] = useState(false);
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
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          ...(withAdv
            ? {
                ownerName,
                ownerEmail,
                ownerPassword,
              }
            : {}),
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
        <p className="text-xs text-muted">
          Cada equipe fica isolada. Marque ADV abaixo ou crie só a equipe e adicione usuários na aba
          Usuários.
        </p>

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Nome da equipe *</label>
            <input
              className="industrial-input"
              placeholder="Ex: Equipe Ligia Lins"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={withAdv}
              onChange={(e) => setWithAdv(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            Criar ADV responsável agora
          </label>

          {withAdv && (
            <div className="grid gap-3 sm:grid-cols-2 rounded-[var(--radius-ui)] border border-border/80 bg-surface/40 p-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Nome do ADV *</label>
                <input
                  className="industrial-input"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  required={withAdv}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Email do ADV *</label>
                <input
                  type="email"
                  className="industrial-input"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  required={withAdv}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-muted">Senha inicial *</label>
                <input
                  type="password"
                  className="industrial-input"
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                  minLength={6}
                  required={withAdv}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={saving}>
              <Icon name="plus" className="h-4 w-4" />
              {saving ? "Criando..." : "Criar equipe"}
            </button>
          </div>
        </form>
      </section>

      <section className="industrial-panel p-4">
        <div className="mb-4 flex items-center gap-2">
          <Icon name="users" className="h-5 w-5 text-muted" />
          <h3 className="text-sm font-semibold">Equipes cadastradas</h3>
        </div>
        {loading ? (
          <p className="text-sm text-muted">Carregando...</p>
        ) : teams.length === 0 ? (
          <p className="text-sm text-muted">Nenhuma equipe — crie a primeira acima.</p>
        ) : (
          <ul className="divide-y divide-border">
            {teams.map((t) => (
              <li key={t.id} className="py-3">
                <p className="font-medium">{t.name}</p>
                <p className="text-xs text-muted">
                  {t.owner
                    ? `ADV: ${t.owner.name} — ${t.owner.email}`
                    : "Sem ADV — adicione na aba Usuários"}
                  {" · "}
                  {t._count.members} membro(s) · {t._count.clients} cliente(s) · {t._count.teses}{" "}
                  tese(s)
                </p>
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
