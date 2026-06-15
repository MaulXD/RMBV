"use client";

export function ClientExtractionSection({
  rawText,
  onRawTextChange,
  onExtract,
  extracting,
  optional = false,
  aiAvailable = true,
  aiHint,
}: {
  rawText: string;
  onRawTextChange: (value: string) => void;
  onExtract: () => void;
  extracting: boolean;
  optional?: boolean;
  aiAvailable?: boolean;
  aiHint?: string | null;
}) {
  return (
    <section className="industrial-panel p-4">
      <h3 className="mb-3 text-xs font-semibold tracking-widest text-muted uppercase">
        Texto para extração{optional ? " (opcional)" : ""}
      </h3>

      {!aiAvailable && (
        <p className="mb-3 rounded-[var(--radius-ui)] border border-amber-600/40 bg-amber-600/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
          Extração com IA indisponível.{" "}
          {aiHint ??
            "Configure OPENAI_API_KEY no servidor (Vercel → Environment Variables) e faça redeploy."}
        </p>
      )}

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
          disabled={extracting || !rawText.trim() || !aiAvailable}
          title={!aiAvailable ? aiHint ?? "IA não configurada" : undefined}
        >
          {extracting ? "Extraindo..." : "Extrair com IA"}
        </button>
      </div>
    </section>
  );
}
