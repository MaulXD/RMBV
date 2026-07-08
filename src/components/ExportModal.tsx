"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { STATUS_OPTIONS } from "@/lib/client-fields";

type Props = {
  open: boolean;
  onClose: () => void;
  baseParams?: Record<string, string>;
};

const COLUMN_GROUPS = [
  {
    label: "Identificação",
    fields: [
      { key: "cod", label: "Código" },
      { key: "name", label: "Nome" },
      { key: "cpf", label: "CPF" },
      { key: "birthDate", label: "Data de nascimento" },
      { key: "tese", label: "Tese" },
    ],
  },
  {
    label: "Status",
    fields: [
      { key: "status", label: "Status" },
      { key: "workflowStatus", label: "Status workflow" },
      { key: "followUpAt", label: "Data retorno" },
    ],
  },
  {
    label: "Óbito",
    fields: [
      { key: "obito", label: "Óbito" },
      { key: "deathDate", label: "Data óbito" },
    ],
  },
  {
    label: "Telefones",
    fields: Array.from({ length: 10 }, (_, i) => ({
      key: `phone${i + 1}`,
      label: `Telefone ${i + 1}`,
    })),
  },
  {
    label: "Endereço",
    fields: [
      { key: "address1", label: "Endereço 1" },
      { key: "address2", label: "Endereço 2" },
      { key: "address3", label: "Endereço 3" },
      { key: "cep", label: "CEP" },
      { key: "logradouro", label: "Logradouro" },
      { key: "numero", label: "Número" },
      { key: "complemento", label: "Complemento" },
      { key: "bairro", label: "Bairro" },
      { key: "cidade", label: "Cidade" },
      { key: "uf", label: "UF" },
    ],
  },
  {
    label: "Datas",
    fields: [
      { key: "createdAt", label: "Criado em" },
      { key: "updatedAt", label: "Atualizado em" },
    ],
  },
];

const DEFAULT_FIELDS = new Set(["cod", "name", "cpf", "status", "phone1", "phone2", "phone3", "phone4"]);
const ALL_KEYS = COLUMN_GROUPS.flatMap((g) => g.fields.map((f) => f.key));

export function ExportModal({ open, onClose, baseParams = {} }: Props) {
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set(DEFAULT_FIELDS));
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleGroup(keys: string[]) {
    const allOn = keys.every((k) => selected.has(k));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOn) keys.forEach((k) => next.delete(k));
      else keys.forEach((k) => next.add(k));
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(ALL_KEYS));
  }

  function selectNone() {
    setSelected(new Set());
  }

  async function handleExport() {
    if (selected.size === 0) return;
    setLoading(true);

    const params = new URLSearchParams(baseParams);
    if (status) params.set("status", status);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    params.set("fields", [...selected].join(","));

    try {
      const res = await fetch(`/api/reports/export?${params}`);
      if (!res.ok) { setLoading(false); return; }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") ?? "";
      const match = /filename="([^"]+)"/.exec(cd);
      const filename = match?.[1] ?? "relatorio.csv";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-surface shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="font-semibold text-foreground">Exportação avançada</h2>
            <p className="text-xs text-muted mt-0.5">Escolha filtros e colunas para o CSV</p>
          </div>
          <button type="button" className="btn-ghost p-1.5" onClick={onClose}>
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Filters */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Filtros</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs text-muted">Status</label>
                <select className="industrial-input" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="">Todos</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">De (criado a partir de)</label>
                <input type="date" className="industrial-input" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">Até (criado até)</label>
                <input type="date" className="industrial-input" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Column selection */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                Colunas ({selected.size} selecionadas)
              </p>
              <div className="flex gap-2">
                <button type="button" className="text-xs text-primary hover:underline" onClick={selectAll}>
                  Todas
                </button>
                <span className="text-xs text-muted">/</span>
                <button type="button" className="text-xs text-muted hover:underline" onClick={selectNone}>
                  Nenhuma
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {COLUMN_GROUPS.map((group) => {
                const keys = group.fields.map((f) => f.key);
                const allOn = keys.every((k) => selected.has(k));
                const someOn = keys.some((k) => selected.has(k));
                return (
                  <div key={group.label}>
                    <div className="mb-1.5 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleGroup(keys)}
                        className={`h-4 w-4 shrink-0 rounded border transition-colors ${
                          allOn
                            ? "border-primary bg-primary text-white"
                            : someOn
                            ? "border-primary bg-primary/30"
                            : "border-border bg-surface"
                        }`}
                        title={allOn ? "Desmarcar grupo" : "Marcar grupo"}
                      >
                        {allOn && (
                          <svg viewBox="0 0 12 12" className="h-full w-full" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                        {someOn && !allOn && (
                          <svg viewBox="0 0 12 12" className="h-full w-full" fill="none">
                            <path d="M3 6h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        )}
                      </button>
                      <span className="text-xs font-medium text-foreground">{group.label}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pl-6">
                      {group.fields.map((field) => {
                        const on = selected.has(field.key);
                        return (
                          <button
                            key={field.key}
                            type="button"
                            onClick={() => toggle(field.key)}
                            className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                              on
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-surface text-muted hover:border-primary/50 hover:text-foreground"
                            }`}
                          >
                            {field.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-5 py-4">
          <p className="text-xs text-muted">
            O arquivo CSV abre no Excel. Máx. 10.000 registros.
          </p>
          <div className="flex gap-2">
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleExport}
              disabled={loading || selected.size === 0}
            >
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <Icon name="rotateCw" className="h-4 w-4 animate-spin" />
                  Exportando...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Icon name="download" className="h-4 w-4" />
                  Exportar CSV
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
