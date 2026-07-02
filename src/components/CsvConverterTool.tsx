"use client";

import { useState } from "react";
import { CSV_HEADERS } from "@/lib/client-fields";
import { parseClientsCsv } from "@/lib/csv-import";
import { downloadBytes } from "@/lib/pdf-organizer";

function detectDelimiter(headerLine: string) {
  return headerLine.includes(";") ? ";" : ",";
}

function convertDelimiter(content: string, target: ";" | ",") {
  const normalized = content.replace(/^\uFEFF/, "").trim();
  const lines = normalized.split(/\r?\n/);
  if (lines.length === 0) return "";

  const source = detectDelimiter(lines[0]!);
  if (source === target) return normalized;

  return lines
    .map((line) => {
      const cells: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]!;
        if (ch === '"') {
          inQuotes = !inQuotes;
          current += ch;
          continue;
        }
        if (ch === source && !inQuotes) {
          cells.push(current);
          current = "";
          continue;
        }
        current += ch;
      }
      cells.push(current);
      return cells.join(target);
    })
    .join("\n");
}

export function CsvConverterTool() {
  const [content, setContent] = useState("");
  const [filename, setFilename] = useState("dados.csv");
  const [message, setMessage] = useState<string | null>(null);

  function loadFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      setContent(String(reader.result ?? ""));
      setFilename(file.name);
      setMessage(null);
    };
    reader.readAsText(file, "utf-8");
  }

  function validate() {
    if (!content.trim()) {
      setMessage("Selecione ou cole um CSV.");
      return;
    }
    const { rows, errors } = parseClientsCsv(content);
    if (errors.length > 0) {
      setMessage(`Atenção: ${errors.join(" · ")}`);
    } else {
      setMessage(`Formato SCS OK — ${rows.length} linha(s) de clientes.`);
    }
  }

  function downloadConverted(target: ";" | ",") {
    const converted = convertDelimiter(content, target);
    const bom = "\uFEFF";
    const bytes = new TextEncoder().encode(bom + converted);
    const ext = target === ";" ? "semicolon" : "comma";
    downloadBytes(bytes, filename.replace(/\.csv$/i, "") + `-${ext}.csv`, "text/csv;charset=utf-8");
  }

  function downloadModel() {
    const header = CSV_HEADERS.join(";");
    const bom = "\uFEFF";
    const bytes = new TextEncoder().encode(bom + header + "\n");
    downloadBytes(bytes, "MODEL.csv", "text/csv;charset=utf-8");
  }

  return (
    <div className="space-y-6">
      <section className="panel-solid space-y-4 p-5">
        <div>
          <h2 className="font-semibold">Conversor CSV ↔ planilha</h2>
          <p className="mt-1 text-sm text-muted">
            Valida o formato do sistema ({CSV_HEADERS.slice(0, 3).join(", ")}…) e converte entre
            ponto-e-vírgula (Excel BR) e vírgula.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="btn-primary cursor-pointer">
            Carregar CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) loadFile(f);
              }}
            />
          </label>
          <button type="button" className="btn-ghost" onClick={downloadModel}>
            Baixar modelo vazio
          </button>
          <button type="button" className="btn-ghost" onClick={validate} disabled={!content}>
            Validar formato
          </button>
        </div>
        <textarea
          className="industrial-input min-h-[200px] font-mono text-xs"
          placeholder="Cole o conteúdo CSV aqui…"
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setMessage(null);
          }}
        />
        {message && <p className="text-sm text-muted">{message}</p>}
        {content && (
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary" onClick={() => downloadConverted(";")}>
              Exportar com ; (Excel BR)
            </button>
            <button type="button" className="btn-ghost" onClick={() => downloadConverted(",")}>
              Exportar com ,
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
