"use client";

export function ClientExtractionSection({
  rawText,
  onRawTextChange,
  onExtract,
  extracting,
  optional = false,
}: {
  rawText: string;
  onRawTextChange: (value: string) => void;
  onExtract: () => void;
  extracting: boolean;
  optional?: boolean;
}) {
  return (
    <section className="industrial-panel p-4">
      <h3 className="mb-3 text-xs font-semibold tracking-widest text-muted uppercase">
        Texto para extração{optional ? " (opcional)" : ""}
      </h3>
      <textarea
        className="terminal-textarea min-h-[200px]"
        placeholder="Cole o texto bruto para extrair COD, TESE, telefones, endereços..."
        value={rawText}
        onChange={(e) => onRawTextChange(e.target.value)}
      />
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          className="btn-primary"
          onClick={onExtract}
          disabled={extracting || !rawText.trim()}
        >
          {extracting ? "Extraindo..." : "Extrair com IA"}
        </button>
      </div>
    </section>
  );
}
