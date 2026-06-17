"use client";

import { useMemo, useState } from "react";
import { validateDocumentBatch } from "@/lib/cpf-cnpj-validator";
import { downloadBytes } from "@/lib/pdf-organizer";

export function CpfCnpjValidatorTool() {
  const [text, setText] = useState("");
  const results = useMemo(() => (text.trim() ? validateDocumentBatch(text) : []), [text]);

  const validCount = results.filter((r) => r.valid).length;
  const invalidCount = results.filter((r) => !r.valid).length;

  function exportCsv() {
    const lines = ["documento;tipo;valido;mensagem", ...results.map((r) =>
      `${r.input};${r.kind};${r.valid ? "sim" : "nao"};${r.message}`
    )];
    const bom = "\uFEFF";
    const bytes = new TextEncoder().encode(bom + lines.join("\n"));
    downloadBytes(bytes, `validacao-cpf-cnpj-${Date.now()}.csv`, "text/csv;charset=utf-8");
  }

  return (
    <div className="space-y-6">
      <section className="panel-solid space-y-4 p-5">
        <div>
          <h2 className="font-semibold">Validador CPF/CNPJ em lote</h2>
          <p className="mt-1 text-sm text-muted">
            Cole um documento por linha. Processamento local no navegador.
          </p>
        </div>
        <textarea
          className="industrial-input min-h-[160px] font-mono text-sm"
          placeholder={"123.456.789-09\n12.345.678/0001-95"}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {results.length > 0 && (
          <p className="text-xs text-muted">
            {results.length} linha(s) · {validCount} válido(s) · {invalidCount} inválido(s)
          </p>
        )}
        {results.length > 0 && (
          <button type="button" className="btn-ghost" onClick={exportCsv}>
            Exportar resultado CSV
          </button>
        )}
      </section>

      {results.length > 0 && (
        <section className="panel-solid overflow-x-auto p-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="pb-2 pr-4">Documento</th>
                <th className="pb-2 pr-4">Tipo</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2">Mensagem</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-2 pr-4 font-mono">{r.input}</td>
                  <td className="py-2 pr-4">{r.kind}</td>
                  <td className={`py-2 pr-4 ${r.valid ? "text-green-600" : "text-red-600"}`}>
                    {r.valid ? "Válido" : "Inválido"}
                  </td>
                  <td className="py-2 text-muted">{r.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
