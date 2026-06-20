"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/components/SessionProvider";
import { Icon } from "@/components/ui/Icon";

type PontoRecord = {
  id: string;
  type: "ENTRADA" | "SAIDA";
  confidence: number | null;
  recordedAt: string;
  user: { id: string; name: string; email: string };
};

export default function PontoPage() {
  const { user } = useSession();
  const [records, setRecords] = useState<PontoRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [teamId, setTeamId] = useState("");

  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/teams")
      .then((r) => r.json())
      .then((d) => {
        const list = d.teams ?? [];
        setTeams(list);
        if (list[0]) setTeamId(list[0].id);
      });
  }, [isAdmin]);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ date });
    if (isAdmin && teamId) params.set("teamId", teamId);
    const res = await fetch(`/api/ponto?${params}`);
    const data = await res.json();
    setRecords(data.records ?? []);
    setLoading(false);
  }, [date, teamId, isAdmin]);

  useEffect(() => { void loadRecords(); }, [loadRecords]);

  const kioskUrl = typeof window !== "undefined"
    ? `${window.location.origin}/kiosk?teamId=${isAdmin ? teamId : user?.teamId ?? ""}`
    : "";

  return (
    <>
      <div className="page-header">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-emerald-500"
            style={{
              background: "color-mix(in srgb, #10b981 10%, var(--color-surface-elevated))",
              borderColor: "color-mix(in srgb, #10b981 25%, transparent)",
            }}
          >
            <Icon name="scanFace" className="h-5 w-5" />
          </span>
          <div>
            <h1 className="page-title">Ponto facial</h1>
            <p className="page-subtitle">Registros de entrada e saída por reconhecimento facial</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {isAdmin && teams.length > 0 && (
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Equipe</label>
            <select className="industrial-input" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Data</label>
          <input
            type="date"
            className="industrial-input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <button type="button" className="btn-ghost" onClick={() => void loadRecords()}>
          <Icon name="rotateCw" className="h-4 w-4" />
          Atualizar
        </button>
      </div>

      {(isAdmin ? teamId : user?.teamId) && (
        <div className="industrial-panel flex items-center justify-between gap-4 p-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted">Link do quiosque</p>
            <code className="block truncate text-xs text-foreground">{kioskUrl}</code>
          </div>
          <a
            href={kioskUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost shrink-0 text-xs"
          >
            <Icon name="play" className="h-3.5 w-3.5" />
            Abrir quiosque
          </a>
        </div>
      )}

      <div className="industrial-panel overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-muted">Carregando...</p>
        ) : records.length === 0 ? (
          <p className="p-6 text-sm text-muted">Nenhum registro para esta data.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2 text-left text-xs font-medium text-muted">Colaborador</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted">Tipo</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted">Horário</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted">Confiança</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-surface-elevated/40 transition-colors">
                  <td className="px-4 py-2.5">
                    <span className="font-medium">{r.user.name}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      r.type === "ENTRADA"
                        ? "bg-emerald-500/15 text-emerald-600"
                        : "bg-amber-500/15 text-amber-600"
                    }`}>
                      {r.type === "ENTRADA" ? "Entrada" : "Saída"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-muted">
                    {new Date(r.recordedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </td>
                  <td className="px-4 py-2.5 text-muted">
                    {r.confidence !== null ? `${(r.confidence * 100).toFixed(0)}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
