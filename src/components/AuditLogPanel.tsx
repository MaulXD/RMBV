"use client";

import { useEffect, useState } from "react";

type Log = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  summary: string;
  createdAt: string;
  user: { name: string; email: string } | null;
};

export function AuditLogPanel() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/audit-logs")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setLogs(d.logs ?? []);
      })
      .catch(() => setError("Falha ao carregar auditoria"));
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <section className="soft-card overflow-hidden">
      <header className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">Auditoria do sistema</h2>
        <p className="text-xs text-muted">Últimas ações registradas</p>
      </header>
      <div className="max-h-96 overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-surface-elevated text-muted">
            <tr>
              <th className="px-3 py-2">Quando</th>
              <th className="px-3 py-2">Quem</th>
              <th className="px-3 py-2">Ação</th>
              <th className="px-3 py-2">Resumo</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-border/60">
                <td className="whitespace-nowrap px-3 py-2 text-muted">
                  {new Date(log.createdAt).toLocaleString("pt-BR")}
                </td>
                <td className="px-3 py-2">{log.user?.name ?? "—"}</td>
                <td className="px-3 py-2">
                  {log.action} · {log.entity}
                </td>
                <td className="px-3 py-2">{log.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && <p className="p-4 text-center text-muted">Nenhum registro ainda</p>}
      </div>
    </section>
  );
}
