"use client";

import { useState } from "react";
import { Icon } from "./ui/Icon";

type Team = { id: string; name: string };

export function BackupPanel({ teams }: { teams: Team[] }) {
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    if (!teamId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/backup?teamId=${teamId}`);
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Erro ao gerar backup");
        return;
      }
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="(.+?)"/);
      const filename = match?.[1] ?? "backup.json";

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  const selectedTeam = teams.find((t) => t.id === teamId);

  return (
    <div className="space-y-6 max-w-xl">
      <div className="industrial-panel p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Icon name="fileDown" className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-semibold">Backup de dados</h2>
        </div>

        <p className="text-sm text-muted">
          Gera um arquivo JSON com todos os clientes, teses e membros da equipe selecionada.
          Guarde o arquivo com segurança — ele contém dados sensíveis.
        </p>

        <div>
          <label className="mb-1 block text-xs text-muted">Equipe</label>
          <select
            className="industrial-input"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="btn-primary"
          disabled={loading || !teamId}
          onClick={handleDownload}
        >
          <Icon name="fileDown" className="h-4 w-4" />
          {loading ? "Gerando..." : `Baixar backup — ${selectedTeam?.name ?? ""}`}
        </button>
      </div>

      <div className="industrial-panel p-5 space-y-2">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-widest">O que está no backup</h3>
        <ul className="space-y-1 text-sm text-muted">
          {[
            "Todos os clientes e seus campos (CPF, telefones, endereços, status)",
            "Teses da equipe",
            "Membros e seus roles",
            "Data e hora da exportação",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              {item}
            </li>
          ))}
        </ul>
        <p className="pt-1 text-xs text-muted">
          Recomendado: baixar um backup antes de operações em lote (deletar, fundir teses, importar CSV em massa).
        </p>
      </div>
    </div>
  );
}
