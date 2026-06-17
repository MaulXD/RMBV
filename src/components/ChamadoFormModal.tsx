"use client";

import { useEffect, useState } from "react";
import type { ChamadoCategory, TaskPriority } from "@prisma/client";
import { CHAMADO_CATEGORY_LABELS } from "@/lib/enum-labels";
import { Icon } from "./ui/Icon";

export type ChamadoFormValues = {
  title: string;
  description: string;
  category: ChamadoCategory;
  priority: TaskPriority;
  assigneeId: string;
  clientId: string;
  clientLabel: string;
};

const emptyForm = (): ChamadoFormValues => ({
  title: "",
  description: "",
  category: "SOLICITACOES",
  priority: "MEDIA",
  assigneeId: "",
  clientId: "",
  clientLabel: "",
});

type Member = { id: string; name: string };

export function ChamadoFormModal({
  open,
  teamId,
  members,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  teamId: string;
  members: Member[];
  saving?: boolean;
  onClose: () => void;
  onSave: (values: ChamadoFormValues) => Promise<void>;
}) {
  const [form, setForm] = useState<ChamadoFormValues>(emptyForm);

  useEffect(() => {
    if (open) setForm(emptyForm());
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="panel-solid max-h-[90vh] w-full max-w-lg overflow-y-auto p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Novo chamado</h2>
          <button type="button" className="btn-ghost p-1" onClick={onClose}>
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void onSave(form);
          }}
        >
          <div>
            <label className="mb-1 block text-xs text-muted">Título</label>
            <input
              className="industrial-input w-full"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
              minLength={3}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">Descrição</label>
            <textarea
              className="industrial-input min-h-[100px] w-full"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted">Categoria</label>
              <select
                className="industrial-input w-full"
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value as ChamadoCategory }))
                }
              >
                {(Object.keys(CHAMADO_CATEGORY_LABELS) as ChamadoCategory[]).map((key) => (
                  <option key={key} value={key}>
                    {CHAMADO_CATEGORY_LABELS[key]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">Prioridade</label>
              <select
                className="industrial-input w-full"
                value={form.priority}
                onChange={(e) =>
                  setForm((f) => ({ ...f, priority: e.target.value as TaskPriority }))
                }
              >
                <option value="BAIXA">Baixa</option>
                <option value="MEDIA">Média</option>
                <option value="ALTA">Alta</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">Responsável (opcional)</label>
            <select
              className="industrial-input w-full"
              value={form.assigneeId}
              onChange={(e) => setForm((f) => ({ ...f, assigneeId: e.target.value }))}
            >
              <option value="">Ninguém ainda</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving || !teamId}>
              {saving ? "Salvando..." : "Abrir chamado"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
