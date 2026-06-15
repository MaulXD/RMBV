"use client";

import { useCallback, useEffect, useState } from "react";
type TeamRow = {
  id: string;
  name: string;
  owner: { id: string; name: string; email: string; role: string } | null;
  _count: { members: number; clients: number; teses: number };
};

export function TeamAdminPanel() {
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/teams");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha");
      setTeams(data.teams ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  }, []);

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
          ownerName: ownerName || undefined,
          ownerEmail: ownerEmail || undefined,
          ownerPassword: ownerPassword || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha");
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
        <h2 className="text-sm font-medium">Nova equipe</h2>
        <p className="text-xs text-muted">
          Cada equipe é isolada: só o Admin vê todas. O ADV gerencia gerentes e colaboradores da
          sua equipe.
        </p>
        <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-muted">Nome da equipe *</label>
            <input
              className="industrial-input"
              placeholder="Ex: Equipe Ligia Lins"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Nome do ADV</label>
            <input
              className="industrial-input"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Email do ADV</label>
            <input
              type="email"
              className="industrial-input"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-muted">Senha inicial do ADV</label>
            <input
              type="password"
              className="industrial-input"
              value={ownerPassword}
              onChange={(e) => setOwnerPassword(e.target.value)}
              minLength={6}
            />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Criando..." : "Criar equipe"}
            </button>
          </div>
        </form>
        {error && <p className="alert alert-error">{error}</p>}
        {message && <p className="alert alert-success">{message}</p>}
      </section>

      <section className="industrial-panel p-4">
        <h3 className="mb-4 text-xs font-semibold tracking-widest text-muted uppercase">
          Equipes cadastradas
        </h3>
        {loading ? (
          <p className="text-sm text-muted">Carregando...</p>
        ) : teams.length === 0 ? (
          <p className="text-sm text-muted">Nenhuma equipe.</p>
        ) : (
          <ul className="divide-y divide-border">
            {teams.map((t) => (
              <li key={t.id} className="py-3">
                <p className="font-medium">{t.name}</p>
                <p className="text-xs text-muted">
                  {t.owner
                    ? `ADV: ${t.owner.name} — ${t.owner.email}`
                    : "Sem ADV vinculado"}
                  {" · "}
                  {t._count.members} membro(s) · {t._count.clients} cliente(s) ·{" "}
                  {t._count.teses} tese(s)
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
