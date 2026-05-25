import { CSV_HEADERS } from "./client-fields";

export type CsvClientRow = {
  cod: string | null;
  tese: string | null;
  name: string;
  cpf: string | null;
  birthDate: string | null;
  obito: string | null;
  deathDate: string | null;
  phone1: string | null;
  phone2: string | null;
  phone3: string | null;
  phone4: string | null;
  phone5: string | null;
  phone6: string | null;
  phone7: string | null;
  phone8: string | null;
  phone9: string | null;
  phone10: string | null;
  address1: string | null;
  address2: string | null;
  address3: string | null;
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
    tese: get(1),
    name,
    cpf: get(3),
    birthDate: get(4),
    obito: get(5),
    deathDate: get(6),
    phone1: get(7),
    phone2: get(8),
    phone3: get(9),
    phone4: get(10),
    phone5: get(11),
    phone6: get(12),
    phone7: get(13),
    phone8: get(14),
    phone9: get(15),
    phone10: get(16),
    address1: get(17),
    address2: get(18),
    address3: get(19),
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
  const expected = CSV_HEADERS.map((h) => normalizeHeader(h));

  const headerOk =
    headerCells.length >= expected.length &&
    expected.every((h, i) => headerCells[i] === h);

  if (!headerOk) {
    errors.push(
      `Cabeçalho inválido. Esperado: ${CSV_HEADERS.join(delimiter)}`
    );
  }

  const rows: CsvClientRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i], delimiter);
    const row = rowFromValues(values);
    if (row) rows.push(row);
    else errors.push(`Linha ${i + 1}: NOME obrigatório`);
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
