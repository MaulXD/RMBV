"use client";

import { useState } from "react";
import { Icon } from "./ui/Icon";

export function ClientBulkActionsBar({
  selectedCount,
  totalCount,
  selectedIds,
  onSelectAll,
  onClear,
  exportCsvHref,
  canDelete,
  onDeleteSuccess,
}: {
  selectedCount: number;
  totalCount: number;
  selectedIds: Set<string>;
  onSelectAll: () => void;
  onClear: () => void;
  exportCsvHref: string | null;
  canDelete?: boolean;
  onDeleteSuccess?: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm] = useState(false);

  if (selectedCount === 0) return null;

  async function handleDelete() {
    if (!confirm) { setConfirm(true); return; }
    setDeleting(true);
    try {
      const res = await fetch("/api/clients/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (res.ok) {
        onClear();
        onDeleteSuccess?.();
        setConfirm(false);
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="industrial-panel mb-3 flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <p className="text-sm font-medium">
        <span className="text-primary font-semibold">{selectedCount}</span>
        <span className="text-muted"> de {totalCount} selecionado(s)</span>
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-ghost text-xs" onClick={onSelectAll}>
          Selecionar todos
        </button>
        <button type="button" className="btn-ghost text-xs" onClick={() => { onClear(); setConfirm(false); }}>
          Limpar seleção
        </button>
        {exportCsvHref && (
          <a href={exportCsvHref} className="btn-ghost text-xs">
            <Icon name="fileDown" className="h-3.5 w-3.5" />
            Exportar CSV
          </a>
        )}
        {canDelete && (
          confirm ? (
            <>
              <span className="self-center text-xs text-danger font-medium">
                Confirmar exclusão de {selectedCount} cliente(s)?
              </span>
              <button
                type="button"
                className="btn-danger text-xs"
                disabled={deleting}
                onClick={handleDelete}
              >
                {deleting ? "Excluindo..." : "Sim, excluir"}
              </button>
              <button
                type="button"
                className="btn-ghost text-xs"
                onClick={() => setConfirm(false)}
              >
                Cancelar
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn-danger text-xs"
              onClick={() => setConfirm(true)}
            >
              <Icon name="trash" className="h-3.5 w-3.5" />
              Excluir selecionados
            </button>
          )
        )}
      </div>
    </div>
  );
}
