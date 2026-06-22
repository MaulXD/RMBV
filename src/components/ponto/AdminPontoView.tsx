"use client";

import { useCallback, useEffect, useState } from "react";
import type { SessionUser } from "@/components/SessionProvider";
import { Icon } from "@/components/ui/Icon";
import { TeamFaceEnrollmentPanel } from "@/components/TeamFaceEnrollmentPanel";
import { pontoTypeLabel } from "@/lib/ponto-hours";
import { type PontoRecord } from "@/lib/ponto-types";

export function AdminPontoView({ user, embedded = false }: { user: SessionUser; embedded?: boolean }) {
  const [records, setRecords] = useState<PontoRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [teamId, setTeamId] = useState("");

  const isAdminRole = user.role === "ADMIN";

  useEffect(() => {
    if (!isAdminRole) return;
    fetch("/api/teams")
      .then((r) => r.json())
      .then((d) => {
        const list = (d.teams ?? []) as { id: string; name: string }[];
        setTeams(list);
        if (list[0]) setTeamId(list[0].id);
      });
  }, [isAdminRole]);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ date });
    if (isAdminRole && teamId) params.set("teamId", teamId);
    const res = await fetch(`/api/ponto?${params}`);
    const data = await res.json() as { records: PontoRecord[] };
    setRecords(data.records ?? []);
    setLoading(false);
  }, [date, teamId, isAdminRole]);

  useEffect(() => { void loadRecords(); }, [loadRecords]);

  const [kioskUrl, setKioskUrl] = useState("");
  const effectiveTeamId = isAdminRole ? teamId : user.teamId ?? "";

  useEffect(() => {
    if (!effectiveTeamId) {
      setKioskUrl("");
      return;
    }
    fetch(`/api/ponto/kiosk-link?teamId=${encodeURIComponent(effectiveTeamId)}`)
      .then((r) => r.json())
      .then((d: { url?: string; error?: string }) => setKioskUrl(d.url ?? ""))
      .catch(() => setKioskUrl(""));
  }, [effectiveTeamId]);

  return (
    <>
      {!embedded && (
        <div className="page-header">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-emerald-500"
              style={{ background: "color-mix(in srgb, #10b981 10%, var(--color-surface-elevated))", borderColor: "color-mix(in srgb, #10b981 25%, transparent)" }}>
              <Icon name="scanFace" className="h-5 w-5" />
            </span>
            <div>
              <h1 className="page-title">Ponto facial</h1>
              <p className="page-subtitle">Registros de entrada e saída por reconhecimento facial</p>
            </div>
          </div>
        </div>
      )}

      {embedded && (
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">Registros da equipe</h2>
          <p className="text-sm text-muted">Filtros, quiosque e histórico do dia</p>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        {isAdminRole && teams.length > 0 && (
          <div>
            <label className="form-label">Equipe</label>
            <select className="industrial-input" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="form-label">Data</label>
          <input type="date" className="industrial-input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <button type="button" className="btn-ghost" onClick={() => void loadRecords()}>
          <Icon name="rotateCw" className="h-4 w-4" />
          Atualizar
        </button>
      </div>

      {(isAdminRole ? teamId : user.teamId) && (
        <div className="industrial-panel flex items-center justify-between gap-4 p-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted">Link do quiosque</p>
            <code className="block truncate text-xs text-foreground">{kioskUrl}</code>
          </div>
          <a href={kioskUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost shrink-0 text-xs">
            <Icon name="play" className="h-3.5 w-3.5" />
            Abrir quiosque
          </a>
        </div>
      )}

      {(isAdminRole ? teamId : user.teamId) && (
        <TeamFaceEnrollmentPanel
          teamId={(isAdminRole ? teamId : user.teamId)!}
          showSettings={user.role === "ADV"}
        />
      )}

      <div className="industrial-panel overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-muted">Carregando...</p>
        ) : records.length === 0 ? (
          <p className="p-6 text-sm text-muted">Nenhum registro para esta data.</p>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="divide-y divide-border/60 md:hidden">
              {records.map((r) => (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{r.user.name}</p>
                    <p className="text-xs text-muted">
                      {new Date(r.recordedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      {r.confidence !== null ? ` · ${(r.confidence * 100).toFixed(0)}%` : ""}
                    </p>
                  </div>
                  <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                    r.type === "ENTRADA" || r.type === "INTERVALO_FIM" ? "bg-emerald-500/15 text-emerald-600" :
                    r.type === "SAIDA" ? "bg-amber-500/15 text-amber-600" : "bg-sky-500/15 text-sky-600"
                  }`}>
                    {pontoTypeLabel(r.type)}
                  </span>
                </div>
              ))}
            </div>
            {/* Desktop table */}
            <table className="hidden w-full text-sm md:table">
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
                    <td className="px-4 py-2.5 font-medium">{r.user.name}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                        r.type === "ENTRADA" || r.type === "INTERVALO_FIM" ? "bg-emerald-500/15 text-emerald-600" :
                        r.type === "SAIDA" ? "bg-amber-500/15 text-amber-600" : "bg-sky-500/15 text-sky-600"
                      }`}>
                        {pontoTypeLabel(r.type)}
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
          </>
        )}
      </div>
    </>
  );
}
