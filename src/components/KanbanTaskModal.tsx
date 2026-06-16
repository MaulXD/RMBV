"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { KanbanColumnItem } from "@/lib/kanban-columns";
import type { TaskListItem } from "@/lib/task-fields";
import { Icon } from "./ui/Icon";
import { TaskHistoryPanel } from "./TaskHistoryPanel";

type Member = { id: string; name: string; role: string };
type ClientOption = { id: string; name: string; cod: string | null };

export type TaskFormValues = {
  title: string;
  description: string;
  columnId: string;
  dueAt: string;
  assigneeId: string;
  clientId: string;
  clientLabel: string;
};

const emptyForm = (columnId: string): TaskFormValues => ({
  title: "",
  description: "",
  columnId,
  dueAt: "",
  assigneeId: "",
  clientId: "",
  clientLabel: "",
});

export function KanbanTaskModal({
  open,
  task,
  defaultColumnId,
  columns,
  teamId,
  teseId,
  members,
  onClose,
  onSave,
  onDelete,
  saving,
  historyRefreshKey = 0,
  presetClient,
  lockClient = false,
}: {
  open: boolean;
  task: TaskListItem | null;
  defaultColumnId?: string;
  columns: KanbanColumnItem[];
  teamId: string;
  teseId: string | null;
  members: Member[];
  onClose: () => void;
  onSave: (values: TaskFormValues) => Promise<void>;
  onDelete?: () => Promise<void>;
  saving?: boolean;
  historyRefreshKey?: number;
  presetClient?: { id: string; name: string; cod: string | null };
  lockClient?: boolean;
}) {
  const [form, setForm] = useState<TaskFormValues>(emptyForm(defaultColumnId ?? columns[0]?.id ?? ""));
  const [clientQuery, setClientQuery] = useState("");
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);
  const [searchingClients, setSearchingClients] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    if (task) {
      setForm({
        title: task.title,
        description: task.description ?? "",
        columnId: task.columnId,
        dueAt: task.dueAt ? task.dueAt.slice(0, 10) : "",
        assigneeId: task.assigneeId ?? "",
        clientId: task.clientId ?? "",
        clientLabel: task.client ? `${task.client.name}${task.client.cod ? ` (${task.client.cod})` : ""}` : "",
      });
      setClientQuery(task.client?.name ?? "");
    } else {
      const col = defaultColumnId ?? columns[0]?.id ?? "";
      const next = emptyForm(col);
      if (presetClient) {
        next.clientId = presetClient.id;
        next.clientLabel = `${presetClient.name}${presetClient.cod ? ` (${presetClient.cod})` : ""}`;
      }
      setForm(next);
      setClientQuery(presetClient?.name ?? "");
    }
  }, [open, task, defaultColumnId, columns, presetClient]);

  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  function searchClients(query: string) {
    setClientQuery(query);
    setForm((prev) => ({ ...prev, clientId: "", clientLabel: "" }));
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (query.trim().length < 2) {
      setClientOptions([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setSearchingClients(true);
      try {
        const params = new URLSearchParams({
          search: query.trim(),
          pageSize: "8",
          page: "1",
        });
        if (teseId) params.set("teseId", teseId);
        if (teamId) params.set("teamId", teamId);
        const res = await fetch(`/api/clients?${params}`);
        const data = await res.json();
        if (res.ok) {
          setClientOptions((data.clients ?? []) as ClientOption[]);
        }
      } finally {
        setSearchingClients(false);
      }
    }, 350);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div
        className={`industrial-panel max-h-[90vh] w-full overflow-y-auto p-5 ${
          task ? "max-w-4xl" : "max-w-lg"
        }`}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">
            {task ? "Editar tarefa" : "Nova tarefa"}
          </h2>
          <button type="button" className="btn-ghost px-2 py-1" onClick={onClose} aria-label="Fechar">
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>

        <div className={task ? "grid gap-6 lg:grid-cols-2" : ""}>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void onSave(form);
            }}
          >
          <div>
            <label className="mb-1 block text-xs text-muted">Título *</label>
            <input
              className="industrial-input"
              required
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">Descrição</label>
            <textarea
              className="industrial-input min-h-[88px] resize-y"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-muted">Coluna</label>
              <select
                className="industrial-input"
                value={form.columnId}
                onChange={(e) => setForm((p) => ({ ...p, columnId: e.target.value }))}
              >
                {columns.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">Prazo (SLA)</label>
              <input
                type="date"
                className="industrial-input"
                value={form.dueAt}
                onChange={(e) => setForm((p) => ({ ...p, dueAt: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">Responsável</label>
            <select
              className="industrial-input"
              value={form.assigneeId}
              onChange={(e) => setForm((p) => ({ ...p, assigneeId: e.target.value }))}
            >
              <option value="">— Sem responsável —</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">Cliente (opcional)</label>
            {lockClient && form.clientId ? (
              <div className="rounded-[var(--radius-ui)] border border-border px-3 py-2 text-sm">
                {form.clientLabel}
              </div>
            ) : (
              <>
                <input
                  className="industrial-input"
                  placeholder="Buscar por nome ou COD..."
                  value={clientQuery}
                  onChange={(e) => searchClients(e.target.value)}
                />
                {searchingClients && <p className="mt-1 text-xs text-muted">Buscando...</p>}
                {clientOptions.length > 0 && !form.clientId && (
                  <ul className="mt-2 max-h-36 overflow-y-auto rounded-[var(--radius-ui)] border border-border">
                    {clientOptions.map((client) => (
                      <li key={client.id}>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-surface-elevated"
                          onClick={() => {
                            setForm((p) => ({
                              ...p,
                              clientId: client.id,
                              clientLabel: `${client.name}${client.cod ? ` (${client.cod})` : ""}`,
                            }));
                            setClientQuery(client.name);
                            setClientOptions([]);
                          }}
                        >
                          {client.name}
                          {client.cod ? <span className="text-muted"> — {client.cod}</span> : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {form.clientId && (
                  <div className="mt-2 flex items-center justify-between gap-2 rounded-[var(--radius-ui)] border border-border px-3 py-2 text-sm">
                    <span>{form.clientLabel}</span>
                    <div className="flex gap-2">
                      <Link href={`/clients/${form.clientId}`} className="text-xs text-primary hover:underline">
                        Abrir
                      </Link>
                      <button
                        type="button"
                        className="text-xs text-muted hover:text-foreground"
                        onClick={() => {
                          setForm((p) => ({ ...p, clientId: "", clientLabel: "" }));
                          setClientQuery("");
                        }}
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-4">
            {task && onDelete ? (
              <button
                type="button"
                className="btn-ghost text-xs text-red-600 dark:text-red-400"
                disabled={saving}
                onClick={() => void onDelete()}
              >
                Excluir
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Salvando..." : task ? "Salvar" : "Criar tarefa"}
              </button>
            </div>
          </div>
          </form>

          {task && <TaskHistoryPanel taskId={task.id} refreshKey={historyRefreshKey} />}
        </div>
      </div>
    </div>
  );
}
