"use client";

export function ClientBulkActionsBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onClear,
  exportCsvHref,
}: {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClear: () => void;
  exportCsvHref: string | null;
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="industrial-panel flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <p className="text-sm font-medium">
        {selectedCount} de {totalCount} selecionado(s)
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-ghost text-xs" onClick={onSelectAll}>
          Selecionar todos
        </button>
        <button type="button" className="btn-ghost text-xs" onClick={onClear}>
          Limpar seleção
        </button>
        {exportCsvHref && (
          <a href={exportCsvHref} className="btn-primary text-xs">
            Exportar CSV
          </a>
        )}
      </div>
    </div>
  );
}
