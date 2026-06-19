"use client";

import { useEffect, useState } from "react";

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const HOURS = Array.from({ length: 25 }, (_, i) => i);

type SessionEntry = {
  id: string;
  loginAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  user: { id: string; name: string; role: string };
};

type AccessRule = {
  id: string;
  userId: string;
  allowedDays: string;
  startHour: number;
  endHour: number;
  enabled: boolean;
  user: { id: string; name: string; role: string };
};

type Member = {
  id: string;
  name: string;
  role: string;
  isActive: boolean;
};

function formatUA(ua: string | null): string {
  if (!ua) return "—";
  if (/mobile/i.test(ua)) return "Mobile";
  if (/chrome/i.test(ua)) return "Chrome";
  if (/firefox/i.test(ua)) return "Firefox";
  if (/safari/i.test(ua)) return "Safari";
  if (/edge/i.test(ua)) return "Edge";
  return "Navegador";
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    ADMIN: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    ADV: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
    GERENTE: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    COLABORADOR: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  };
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${colors[role] ?? colors.COLABORADOR}`}>
      {role}
    </span>
  );
}

function SessionsTab({ teamId }: { teamId: string | null }) {
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({ limit: "200" });
    if (teamId) params.set("teamId", teamId);
    fetch(`/api/equipe/sessions?${params}`)
      .then((r) => r.json())
      .then((d) => setSessions(d.sessions ?? []))
      .finally(() => setLoading(false));
  }, [teamId]);

  if (loading) return <p className="text-xs text-muted">Carregando...</p>;
  if (sessions.length === 0) return <p className="text-xs text-muted">Nenhum login registrado ainda.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[540px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[11px] font-semibold uppercase tracking-widest text-muted">
            <th className="pb-2 pr-4">Usuário</th>
            <th className="pb-2 pr-4">Função</th>
            <th className="pb-2 pr-4">Data / Hora</th>
            <th className="pb-2 pr-4">IP</th>
            <th className="pb-2">Dispositivo</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <tr key={s.id} className="border-b border-border/50 last:border-0">
              <td className="py-2 pr-4 font-medium text-foreground">{s.user.name}</td>
              <td className="py-2 pr-4"><RoleBadge role={s.user.role} /></td>
              <td className="py-2 pr-4 tabular-nums text-muted">{formatDateTime(s.loginAt)}</td>
              <td className="py-2 pr-4 font-mono text-xs text-muted">{s.ipAddress ?? "—"}</td>
              <td className="py-2 text-xs text-muted">{formatUA(s.userAgent)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RuleForm({
  members,
  existingRules,
  onSaved,
}: {
  members: Member[];
  existingRules: AccessRule[];
  onSaved: () => void;
}) {
  const eligibleMembers = members.filter(
    (m) => m.role === "GERENTE" || m.role === "COLABORADOR"
  );

  const [userId, setUserId] = useState(eligibleMembers[0]?.id ?? "");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startHour, setStartHour] = useState(8);
  const [endHour, setEndHour] = useState(18);
  const [saving, setSaving] = useState(false);

  // Pre-fill if editing existing rule for selected user
  useEffect(() => {
    const rule = existingRules.find((r) => r.userId === userId);
    if (rule) {
      setDays(JSON.parse(rule.allowedDays));
      setStartHour(rule.startHour);
      setEndHour(rule.endHour);
    } else {
      setDays([1, 2, 3, 4, 5]);
      setStartHour(8);
      setEndHour(18);
    }
  }, [userId, existingRules]);

  function toggleDay(d: number) {
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()
    );
  }

  async function handleSave() {
    if (!userId || days.length === 0 || startHour >= endHour) return;
    setSaving(true);
    try {
      await fetch("/api/equipe/access-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, allowedDays: days, startHour, endHour, enabled: true }),
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  if (eligibleMembers.length === 0) {
    return <p className="text-xs text-muted">Nenhum colaborador ou gerente para configurar.</p>;
  }

  return (
    <div className="space-y-4 panel-solid p-5">
      <h3 className="text-sm font-semibold text-foreground">Definir restrição de horário</h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-muted">Usuário</label>
          <select
            className="industrial-input w-full"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          >
            {eligibleMembers.map((m) => (
              <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">Horário permitido</label>
          <div className="flex items-center gap-2">
            <select
              className="industrial-input flex-1"
              value={startHour}
              onChange={(e) => setStartHour(Number(e.target.value))}
            >
              {HOURS.slice(0, 24).map((h) => (
                <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
              ))}
            </select>
            <span className="text-xs text-muted">até</span>
            <select
              className="industrial-input flex-1"
              value={endHour}
              onChange={(e) => setEndHour(Number(e.target.value))}
            >
              {HOURS.slice(1).map((h) => (
                <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs text-muted">Dias permitidos</label>
        <div className="flex flex-wrap gap-2">
          {DAY_LABELS.map((label, i) => (
            <button
              key={i}
              type="button"
              onClick={() => toggleDay(i)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                days.includes(i)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted hover:border-primary/40"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {startHour >= endHour && (
        <p className="text-xs text-red-600 dark:text-red-400">Hora final deve ser maior que a inicial.</p>
      )}

      <button
        type="button"
        className="btn-primary"
        onClick={() => void handleSave()}
        disabled={saving || days.length === 0 || startHour >= endHour}
      >
        {saving ? "Salvando..." : "Salvar restrição"}
      </button>
    </div>
  );
}

function RulesTab({
  members,
  canEdit,
  teamId,
}: {
  members: Member[];
  canEdit: boolean;
  teamId: string | null;
}) {
  const [rules, setRules] = useState<AccessRule[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadRules() {
    setLoading(true);
    const params = new URLSearchParams();
    if (teamId) params.set("teamId", teamId);
    const res = await fetch(`/api/equipe/access-rules?${params}`);
    const d = await res.json();
    setRules(d.rules ?? []);
    setLoading(false);
  }

  useEffect(() => { void loadRules(); }, [teamId]);

  async function handleDelete(id: string) {
    if (!confirm("Remover restrição de acesso?")) return;
    await fetch(`/api/equipe/access-rules/${id}`, { method: "DELETE" });
    await loadRules();
  }

  async function toggleEnabled(rule: AccessRule) {
    await fetch("/api/equipe/access-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: rule.userId,
        allowedDays: JSON.parse(rule.allowedDays),
        startHour: rule.startHour,
        endHour: rule.endHour,
        enabled: !rule.enabled,
      }),
    });
    await loadRules();
  }

  return (
    <div className="space-y-5">
      {canEdit && (
        <RuleForm members={members} existingRules={rules} onSaved={() => void loadRules()} />
      )}

      {loading ? (
        <p className="text-xs text-muted">Carregando...</p>
      ) : rules.length === 0 ? (
        <p className="text-xs text-muted">Nenhuma restrição configurada. Sem regras, todos os usuários podem acessar a qualquer hora.</p>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => {
            const days: number[] = JSON.parse(rule.allowedDays);
            return (
              <div
                key={rule.id}
                className={`panel-solid flex flex-wrap items-center gap-4 p-4 ${!rule.enabled ? "opacity-50" : ""}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{rule.user.name}</span>
                    <RoleBadge role={rule.user.role} />
                    {!rule.enabled && (
                      <span className="rounded bg-border/60 px-1.5 py-0.5 text-[10px] text-muted">
                        pausado
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted">
                    <span className="font-medium text-foreground">
                      {String(rule.startHour).padStart(2, "0")}:00 – {String(rule.endHour).padStart(2, "0")}:00
                    </span>
                    <span>
                      {days.map((d) => DAY_LABELS[d]).join(", ")}
                    </span>
                  </div>
                </div>
                {canEdit && (
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      className="btn-ghost px-2.5 py-1 text-xs"
                      onClick={() => void toggleEnabled(rule)}
                      title={rule.enabled ? "Pausar restrição" : "Ativar restrição"}
                    >
                      {rule.enabled ? "Pausar" : "Ativar"}
                    </button>
                    <button
                      type="button"
                      className="btn-icon-bordered hover:border-red-400/50 hover:bg-red-500/[0.08] hover:text-red-600 dark:hover:text-red-400"
                      title="Remover"
                      onClick={() => void handleDelete(rule.id)}
                    >
                      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AccessControlPanel({
  members,
  canEdit,
  teamId,
}: {
  members: Member[];
  canEdit: boolean;
  teamId: string | null;
}) {
  const [tab, setTab] = useState<"sessoes" | "horarios">("sessoes");

  return (
    <div className="space-y-5">
      <div className="flex gap-1 border-b border-border">
        {(["sessoes", "horarios"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {t === "sessoes" ? "Histórico de logins" : "Controle de horários"}
          </button>
        ))}
      </div>

      {tab === "sessoes" ? (
        <SessionsTab teamId={teamId} />
      ) : (
        <RulesTab members={members} canEdit={canEdit} teamId={teamId} />
      )}
    </div>
  );
}
