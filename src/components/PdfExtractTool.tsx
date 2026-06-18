"use client";

import { useState } from "react";
import { ocrPdfBytes } from "@/lib/pdf-compress-ocr";
import { Icon } from "./ui/Icon";

function extractFields(text: string) {
  const cpfMatch = text.match(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/);
  const phoneMatch = text.match(/\(?\d{2}\)?\s*\d{4,5}-?\d{4}/);
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 5 && !/^\d+$/.test(l));
  const name = lines[0] ?? null;
  return {
    name,
    cpf: cpfMatch?.[0] ?? null,
    phone: phoneMatch?.[0] ?? null,
  };
}

export function PdfExtractTool() {
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [fields, setFields] = useState<ReturnType<typeof extractFields> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File) {
    setLoading(true);
    setError(null);
    setText(null);
    setFields(null);
    try {
      const bytes = await file.arrayBuffer();
      const ocrText = await ocrPdfBytes(new Uint8Array(bytes));
      setText(ocrText);
      setFields(extractFields(ocrText));
    } catch {
      setError("Falha ao extrair texto do PDF.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="soft-card space-y-4 p-5">
      <p className="text-sm text-muted">
        Envie um PDF para OCR local e sugestão automática de nome, CPF e telefone.
      </p>
      <input
        type="file"
        accept="application/pdf"
        className="text-sm"
        disabled={loading}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFile(f);
        }}
      />
      {loading && <p className="text-sm text-muted">Extraindo texto…</p>}
      {error && <p className="alert alert-error">{error}</p>}
      {fields && (
        <div className="grid gap-2 sm:grid-cols-3">
          {(["name", "cpf", "phone"] as const).map((key) => (
            <div key={key} className="rounded-lg border border-border p-3">
              <p className="text-[10px] font-bold uppercase text-muted">{key}</p>
              <p className="text-sm font-medium">{fields[key] ?? "—"}</p>
            </div>
          ))}
        </div>
      )}
      {text && (
        <div>
          <button
            type="button"
            className="btn-ghost mb-2 text-xs"
            onClick={() => void navigator.clipboard.writeText(text)}
          >
            <Icon name="copy" className="h-3.5 w-3.5" />
            Copiar texto completo
          </button>
          <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-surface p-3 text-xs">
            {text}
          </pre>
        </div>
      )}
    </section>
  );
}
