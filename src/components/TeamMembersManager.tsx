"use client";

import { useCallback, useEffect, useState } from "react";
import { ROLE_LABELS } from "@/lib/roles";
import { SelectField } from "./ui/SelectField";
import { Icon } from "./ui/Icon";

type Member = {
  id: string;
  name: string;
  email: string;
  role: "ADV" | "GERENTE" | "COLABORADOR" | "ADMIN" | "PESQUISADOR";
  isActive: boolean;
  createdAt: string;
  workType?: "ESTAGIARIO" | "CLT" | null;
  gpsRequired?: boolean;
  gpsRadiusMeters?: number | null;
};

type TeamInfo = {
  id: string;
  name: string;
  owner: { id: string; name: string; email: string } | null;
};

export function TeamMembersManager({ canInvite }: { canInvite: boolean }) {
  const [team, setTeam] = useState<TeamInfo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"GERENTE" | "COLABORADOR" | "PESQUISADOR">("COLABORADOR");
  const [workType, setWorkType] = useState<"ESTAGIARIO" | "CLT">("CLT");
  const [gpsRequired, setGpsRequired] = useState(false);
  const [saving, setSaving] = useState(false);
  const [patchingId, setPatchingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/teams/members");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao carregar equipe");
      setTeam(data.team);
      setMembers(data.members ?? []);
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
      const res = await fetch("/api/teams/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role, workType, gpsRequired }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao cadastrar");
      setName("");
      setEmail("");
      setPassword("");
      const roleKey = data.member.role as keyof typeof ROLE_LABELS;
      setMessage(`${ROLE_LABELS[roleKey]} cadastrado.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setSaving(false);
    }
  }

  async function patchMember(
    id: string,
    patch: { role?: string; isActive?: boolean; workType?: string; gpsRequired?: boolean }
  ) {
    setPatchingId(id);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/teams/members/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao atualizar");
      if (patch.isActive !== undefined) {
        setMessage(patch.isActive ? "Acesso reativado." : "Acesso suspenso.");
      } else {
        setMessage("Função atualizada.");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setPatchingId(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">Carregando equipe...</p>;
  }

  const editableRoles = ["GERENTE", "COLABORADOR", "PESQUISADOR"] as const;
  const canEdit = canInvite;

  return (
    <div className="space-y-6">
      {team && (
        <section className="industrial-panel p-4">
          <h2 className="text-lg font-semibold">{team.name}</h2>
          {team.owner && (
            <p className="mt-1 text-sm text-muted">
              ADV responsável: {team.owner.name} ({team.owner.email})
            </p>
          )}
        </section>
      )}

      <section className="industrial-panel p-4">
        <h3 className="mb-4 text-xs font-semibold tracking-widest text-muted uppercase">
          Membros da equipe
        </h3>
        {members.length === 0 ? (
          <p className="text-sm text-muted">Nenhum membro.</p>
        ) : (
          <ul className="divide-y divide-border">
            {members.map((m) => {
              const isEditable = canEdit && m.role !== "ADV" && m.role !== "ADMIN";
              const isPatching = patchingId === m.id;
              return (
                <li
                  key={m.id}
                  className={`flex flex-wrap items-center justify-between gap-3 py-3 ${!m.isActive ? "opacity-50" : ""}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium leading-tight">
                      {m.name}
                      {!m.isActive && (
                        <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 dark:bg-red-900/30 dark:text-red-400">
                          SUSPENSO
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted">{m.email}</p>
                    {m.workType && (
                      <p className="text-[11px] text-muted">
                        {m.workType === "ESTAGIARIO" ? "Estagiário (6h)" : "CLT (8h)"}
                        {m.gpsRequired ? " · GPS obrigatório" : ""}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {isEditable && (
                      <select
                        className="industrial-input py-1 text-xs"
                        value={m.workType ?? "CLT"}
                        disabled={isPatching}
                        onChange={(e) =>
                          void patchMember(m.id, { workType: e.target.value })
                        }
                      >
                        <option value="CLT">CLT (8h)</option>
                        <option value="ESTAGIARIO">Estagiário (6h)</option>
                      </select>
                    )}
                    {isEditable && (
                      <label className="flex items-center gap-1 text-xs text-muted">
                        <input
                          type="checkbox"
                          checked={m.gpsRequired ?? false}
                          disabled={isPatching}
                          onChange={(e) =>
                            void patchMember(m.id, { gpsRequired: e.target.checked })
                          }
                        />
                        GPS
                      </label>
                    )}
                    {isEditable ? (
                      <select
                        className="industrial-input py-1 text-xs"
                        value={m.role}
                        disabled={isPatching}
                        onChange={(e) => void patchMember(m.id, { role: e.target.value })}
                      >
                        {editableRoles.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="rounded-[var(--radius-ui)] border border-border px-2 py-0.5 text-xs">
                        {ROLE_LABELS[m.role]}
                      </span>
                    )}

                    {isEditable && (
                      <button
                        type="button"
                        disabled={isPatching}
                        onClick={() => void patchMember(m.id, { isActive: !m.isActive })}
                        className={`rounded-[var(--radius-ui)] border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                          m.isActive
                            ? "border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                            : "border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                        }`}
                      >
                        {isPatching ? "..." : m.isActive ? "Suspender" : "Reativar"}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {canInvite && (
        <section className="industrial-panel space-y-4 p-4">
          <h3 className="text-xs font-semibold tracking-widest text-muted uppercase">
            Cadastrar gerente ou colaborador
          </h3>
          <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-muted">Nome</label>
              <input
                className="industrial-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">Login</label>
              <input
                className="industrial-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">Senha inicial</label>
              <input
                type="password"
                className="industrial-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <SelectField
              label="Papel"
              value={role}
              onChange={(v) => setRole(v as "GERENTE" | "COLABORADOR" | "PESQUISADOR")}
            >
              <option value="GERENTE">Gerente</option>
              <option value="COLABORADOR">Colaborador</option>
              <option value="PESQUISADOR">Pesquisador</option>
            </SelectField>
            <SelectField
              label="Tipo de jornada"
              value={workType}
              onChange={(v) => setWorkType(v as "ESTAGIARIO" | "CLT")}
            >
              <option value="CLT">CLT (8h)</option>
              <option value="ESTAGIARIO">Estagiário (6h)</option>
            </SelectField>
            <label className="flex items-center gap-2 text-sm text-muted sm:col-span-2">
              <input
                type="checkbox"
                checked={gpsRequired}
                onChange={(e) => setGpsRequired(e.target.checked)}
              />
              Exigir GPS no ponto mobile para este membro
            </label>
            <div className="sm:col-span-2 flex justify-end">
              <button type="submit" className="btn-primary" disabled={saving}>
                <Icon name="userPlus" className="h-4 w-4" />
                {saving ? "Cadastrando..." : "Adicionar à equipe"}
              </button>
            </div>
          </form>
        </section>
      )}

      {error && <p className="alert alert-error">{error}</p>}
      {message && <p className="alert alert-success">{message}</p>}
    </div>
  );
}
