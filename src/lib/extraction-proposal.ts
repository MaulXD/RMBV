import {
  parseResearchText,
  type DataCategory,
  type ParsedResearch,
} from "./text-intelligence";

const SNAPSHOT_KEYS = [
  "cod",
  "name",
  "cpf",
  "birthDate",
  "obito",
  "deathDate",
  "phone1",
  "phone2",
  "phone3",
  "phone4",
  "phone5",
  "phone6",
  "phone7",
  "phone8",
  "phone9",
  "phone10",
  "address1",
  "address2",
  "address3",
] as const;

export type ClientSnapshot = Record<string, string | null | undefined>;

export function toClientSnapshot(source: Record<string, unknown>): ClientSnapshot {
  const out: ClientSnapshot = {};
  for (const key of SNAPSHOT_KEYS) {
    const value = source[key];
    out[key] = typeof value === "string" ? value : value == null ? null : String(value);
  }
  return out;
}

export type FullParsedResearch = ParsedResearch & {
  scalars: {
    cpf: string | null;
    name: string | null;
    birthDate: string | null;
    deathDate: string | null;
    obito: string | null;
    cod: string | null;
  };
};

export type ExtractionApplyPlan = {
  fields: Record<string, string>;
  phoneChecks: { phoneKey: string; phoneNumber: string; result: "VALIDO" }[];
  filledFields: string[];
  overwrittenFields: string[];
  parsed: FullParsedResearch;
};

const DATE_VALUE = /(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/;
const CPF_IN_TEXT =
  /(?:\b|(?<=\D))(\d{3}[.\s]?\d{3}[.\s]?\d{3}[-.\s]?\d{2}|\d{11})(?:\b|(?=\D))/g;

const LABEL_ONLY = {
  cpf: /^(?:cpf|c\.p\.f\.?|cpf\/cnpj|documento)\s*:?\s*$/i,
  name: /^(?:nome(?:\s+completo)?|name)\s*:?\s*$/i,
  birthDate:
    /^(?:data\s+de\s+nascimento|data\s+nasc(?:imento)?\.?|dt\.?\s*nasc\.?|nascimento|nasc\.?)\s*:?\s*$/i,
  deathDate:
    /^(?:data\s+(?:de\s+)?[oó]bito|data\s+obito|data\s+falecimento|falecimento)\s*:?\s*$/i,
  obito: /^(?:[oó]bito|obito|falecido)\s*:?\s*$/i,
  cod: /^(?:cod|c[oó]digo)\s*:?\s*$/i,
} as const;

const LABEL_INLINE = {
  cpf: /^(?:cpf|c\.p\.f\.?|cpf\/cnpj|documento)\s*[:\-|]\s*(.+)$/i,
  name: /^(?:nome(?:\s+completo)?|name)\s*[:\-|]\s*(.+)$/i,
  birthDate:
    /^(?:data\s+de\s+nascimento|data\s+nasc(?:imento)?\.?|dt\.?\s*nasc\.?|nascimento|nasc\.?)\s*[:\-|]\s*(.+)$/i,
  deathDate:
    /^(?:data\s+(?:de\s+)?[oó]bito|data\s+obito|data\s+falecimento|falecimento)\s*[:\-|]\s*(.+)$/i,
  obito: /^(?:[oó]bito|obito|falecido)\s*[:\-|]\s*(.+)$/i,
  cod: /^(?:cod|c[oó]digo)\s*[:\-|]\s*(.+)$/i,
} as const;

type ScalarField = keyof FullParsedResearch["scalars"];

function formatCpf(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (!isValidCpf(d)) return null;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function isValidCpf(digits: string): boolean {
  const d = digits.replace(/\D/g, "");
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i += 1) sum += Number(d[i]) * (10 - i);
  let check = (sum * 10) % 11;
  if (check === 10) check = 0;
  if (check !== Number(d[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i += 1) sum += Number(d[i]) * (11 - i);
  check = (sum * 10) % 11;
  if (check === 10) check = 0;
  return check === Number(d[10]);
}

function normalizeDate(raw: string): string | null {
  const m = raw.trim().match(DATE_VALUE);
  if (!m) return null;
  const parts = m[1].match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (!parts) return null;
  const day = parts[1].padStart(2, "0");
  const month = parts[2].padStart(2, "0");
  let year = parts[3];
  if (year.length === 2) year = Number(year) > 30 ? `19${year}` : `20${year}`;
  if (Number(month) < 1 || Number(month) > 12 || Number(day) < 1 || Number(day) > 31) return null;
  return `${day}/${month}/${year}`;
}

function normalizeObito(raw: string): string | null {
  const v = raw.trim().toLowerCase();
  if (["sim", "s", "yes", "true"].includes(v)) return "Sim";
  if (["não", "nao", "n", "no", "false"].includes(v)) return "Não";
  if (DATE_VALUE.test(v)) return "Sim";
  return null;
}

function cleanName(raw: string): string | null {
  const name = raw
    .replace(/\s+/g, " ")
    .replace(/[|;,]+$/g, "")
    .trim();
  if (name.length < 3) return null;
  if (/\d{3}/.test(name)) return null;
  if (/^(telefones?|endere[cç]os?|e-?mails?|dados)\b/i.test(name)) return null;
  return name.slice(0, 120);
}

function splitLines(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function isPhoneContext(line: string): boolean {
  return /\b(telefone|celular|whatsapp|fone|contato|\(\d{2}\))\b/i.test(line);
}

function findCpfsInText(text: string): string[] {
  const found: string[] = [];
  const lines = splitLines(text);

  for (const line of lines) {
    if (isPhoneContext(line)) continue;
    const regex = new RegExp(CPF_IN_TEXT.source, "g");
    let match: RegExpExecArray | null;
    while ((match = regex.exec(line)) !== null) {
      const formatted = formatCpf(match[1]);
      if (formatted && !found.includes(formatted)) found.push(formatted);
    }
  }
  return found;
}

function parseScalarField(field: ScalarField, raw: string): string | null {
  switch (field) {
    case "cpf":
      return formatCpf(raw);
    case "birthDate":
    case "deathDate":
      return normalizeDate(raw);
    case "obito":
      return normalizeObito(raw);
    case "name":
      return cleanName(raw);
    case "cod":
      return raw.trim().slice(0, 40) || null;
    default:
      return raw.trim() || null;
  }
}

function extractScalarsFromLines(lines: string[]): FullParsedResearch["scalars"] {
  const scalars: FullParsedResearch["scalars"] = {
    cpf: null,
    name: null,
    birthDate: null,
    deathDate: null,
    obito: null,
    cod: null,
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    for (const field of Object.keys(LABEL_INLINE) as ScalarField[]) {
      if (scalars[field]) continue;

      const inline = line.match(LABEL_INLINE[field]);
      if (inline) {
        const value = parseScalarField(field, inline[1]);
        if (value) scalars[field] = value;
        continue;
      }

      if (LABEL_ONLY[field].test(line)) {
        const next = lines[i + 1];
        if (!next) continue;
        const value = parseScalarField(field, next);
        if (value) {
          scalars[field] = value;
          i += 1;
        }
      }
    }

    // "DATA DE NASCIMENTO    15/03/1985" — rótulo + valor separados por espaços/tabs
    if (!scalars.birthDate) {
      const spaced = line.match(
        /^(?:data\s+de\s+nascimento|data\s+nasc(?:imento)?|dt\.?\s*nasc\.?|nascimento)\s+(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})\s*$/i
      );
      if (spaced) scalars.birthDate = normalizeDate(spaced[1]);
    }

    if (!scalars.deathDate) {
      const spaced = line.match(
        /^(?:data\s+(?:de\s+)?[oó]bito|data\s+obito|falecimento)\s+(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})\s*$/i
      );
      if (spaced) scalars.deathDate = normalizeDate(spaced[1]);
    }

    if (!scalars.cpf) {
      const spaced = line.match(/^(?:cpf|c\.p\.f\.?)\s+([\d.\s\-]+)\s*$/i);
      if (spaced) scalars.cpf = formatCpf(spaced[1]);
    }
  }

  // Datas soltas perto de rótulo nas linhas anteriores
  for (let i = 0; i < lines.length; i += 1) {
    const date = normalizeDate(lines[i]);
    if (!date) continue;

    const prev = lines[i - 1] ?? "";
    const prev2 = lines[i - 2] ?? "";

    if (!scalars.birthDate && /nasc(?:imento)?|dt\.?\s*nasc/i.test(`${prev} ${prev2}`)) {
      scalars.birthDate = date;
    }
    if (!scalars.deathDate && /[oó]bito|falecimento/i.test(`${prev} ${prev2}`)) {
      scalars.deathDate = date;
    }
  }

  if (!scalars.cpf) {
    const cpfs = findCpfsInText(lines.join("\n"));
    if (cpfs[0]) scalars.cpf = cpfs[0];
  }

  return scalars;
}

function categoryRank(category: DataCategory): number {
  if (category === "cliente") return 0;
  if (category === "outros") return 1;
  return 2;
}


export function parseFullResearchText(text: string): FullParsedResearch {
  const parsed = parseResearchText(text);
  const scalars = extractScalarsFromLines(splitLines(text));
  return { ...parsed, scalars };
}

function valuesEqual(key: string, current: string, next: string): boolean {
  const a = current.trim();
  const b = next.trim();
  if (a === b) return true;
  if (key.startsWith("phone")) {
    return a.replace(/\D/g, "") === b.replace(/\D/g, "");
  }
  return false;
}

export function buildExtractionApplyPlan(
  text: string,
  snapshot: ClientSnapshot,
  options?: { includeAutorPhones?: boolean }
): ExtractionApplyPlan {
  const parsed = parseFullResearchText(text);
  const fields: Record<string, string> = {};
  const phoneChecks: ExtractionApplyPlan["phoneChecks"] = [];
  const filledFields: string[] = [];
  const overwrittenFields: string[] = [];
  const working = { ...snapshot };

  const scalarMap: ScalarField[] = ["cod", "name", "cpf", "birthDate", "obito", "deathDate"];

  for (const key of scalarMap) {
    const value = parsed.scalars[key];
    if (!value) continue;
    const current = String(working[key] ?? "").trim();
    if (valuesEqual(key, current, value)) continue;
    fields[key] = value;
    working[key] = value;
    filledFields.push(key);
    if (current) overwrittenFields.push(key);
  }

  const phones = [...parsed.phones]
    .filter((p) => options?.includeAutorPhones || p.category !== "autor")
    .sort((a, b) => categoryRank(a.category) - categoryRank(b.category));

  const seenPhoneDigits = new Set<string>();
  const uniquePhones = phones.filter((phone) => {
    if (seenPhoneDigits.has(phone.digits)) return false;
    seenPhoneDigits.add(phone.digits);
    return true;
  });

  for (let i = 0; i < uniquePhones.length && i < 10; i += 1) {
    const phone = uniquePhones[i];
    const slot = `phone${i + 1}`;
    const current = String(working[slot] ?? "").trim();
    if (valuesEqual(slot, current, phone.value)) continue;

    fields[slot] = phone.value;
    working[slot] = phone.value;
    filledFields.push(slot);
    if (current) overwrittenFields.push(slot);
    phoneChecks.push({ phoneKey: slot, phoneNumber: phone.value, result: "VALIDO" });
  }

  const addresses = [...parsed.addresses]
    .filter((a) => a.category !== "autor")
    .sort((a, b) => categoryRank(a.category) - categoryRank(b.category));

  const seenAddresses = new Set<string>();
  const uniqueAddresses = addresses.filter((address) => {
    const key = address.value.toLowerCase();
    if (seenAddresses.has(key)) return false;
    seenAddresses.add(key);
    return true;
  });

  for (let i = 0; i < uniqueAddresses.length && i < 3; i += 1) {
    const address = uniqueAddresses[i];
    const slot = `address${i + 1}`;
    const current = String(working[slot] ?? "").trim();
    if (valuesEqual(slot, current, address.value)) continue;

    fields[slot] = address.value;
    working[slot] = address.value;
    filledFields.push(slot);
    if (current) overwrittenFields.push(slot);
  }

  return { fields, phoneChecks, filledFields, overwrittenFields, parsed };
}
