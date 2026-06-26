import { CSV_HEADERS } from "./client-fields";

export type CsvClientRow = {
  cod: string | null;
  cpf: string | null;
  name: string;
  obito: string | null;
  phone1: string | null;
  phone2: string | null;
  phone3: string | null;
  phone4: string | null;
};

function normalizeHeader(h: string) {
  return h.trim().toUpperCase().replace(/\s+/g, " ");
}

function parseLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  result.push(current.trim());
  return result;
}

function rowFromValues(values: string[]): CsvClientRow | null {
  const get = (index: number) => {
    const v = values[index]?.trim();
    return v ? v : null;
  };

  const name = get(2);
  if (!name) return null;

  return {
    cod: get(0),
    cpf: get(1),
    name,
    obito: get(3),
    phone1: get(4),
    phone2: get(5),
    phone3: get(6),
    phone4: get(7),
  };
}

export function parseClientsCsv(content: string): {
  rows: CsvClientRow[];
  errors: string[];
} {
  const errors: string[] = [];
  const normalized = content.replace(/^\uFEFF/, "").trim();
  if (!normalized) {
    return { rows: [], errors: ["Arquivo CSV vazio"] };
  }

  const lines = normalized.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    return { rows: [], errors: ["CSV precisa ter cabeçalho e ao menos uma linha de dados"] };
  }

  const delimiter = lines[0].includes(";") ? ";" : ",";
  const headerCells = parseLine(lines[0], delimiter).map(normalizeHeader);

  // Map columns by header name — tolerates any column order
  const idx = (name: string) => headerCells.indexOf(normalizeHeader(name));

  const iCod    = idx("CODIGO");
  const iCpf    = idx("CPF");
  const iNome   = idx("NOME");
  const iObito  = idx("ÓBITO");
  const iPhone1 = idx("TELEFONE1");
  const iPhone2 = idx("TELEFONE 2");
  const iPhone3 = idx("TELEFONE 3");
  const iPhone4 = idx("TELEFONE 4");

  if (iNome === -1) {
    return { rows: [], errors: ["Coluna NOME não encontrada no cabeçalho"] };
  }

  const rows: CsvClientRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i], delimiter);
    const get = (colIdx: number) => {
      if (colIdx === -1) return null;
      const v = values[colIdx]?.trim();
      return v ? v : null;
    };
    const name = get(iNome);
    if (!name) { errors.push(`Linha ${i + 1}: NOME obrigatório`); continue; }
    rows.push({
      cod:    get(iCod),
      cpf:    get(iCpf),
      name,
      obito:  get(iObito),
      phone1: get(iPhone1),
      phone2: get(iPhone2),
      phone3: get(iPhone3),
      phone4: get(iPhone4),
    });
  }

  return { rows, errors };
}

export function clientsToCsv(
  clients: Record<string, string>[]
): string {
  const headers = [...CSV_HEADERS, "STATUS"];
  const delimiter = ";";
  const escape = (v: string) => {
    if (v.includes(delimiter) || v.includes('"') || v.includes("\n")) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };

  const lines = [
    headers.join(delimiter),
    ...clients.map((row) =>
      headers.map((h) => escape(row[h] ?? "")).join(delimiter)
    ),
  ];
  return lines.join("\n");
}
