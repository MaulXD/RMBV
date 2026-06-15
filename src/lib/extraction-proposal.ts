import {
  formatBrazilPhone,
  nextEmptyAddressSlot,
  nextEmptyPhoneSlot,
  parseResearchText,
  type DataCategory,
  type ParsedResearch,
} from "./text-intelligence";
import { PHONE_FIELD_KEYS } from "./client-fields";

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
  parsed: FullParsedResearch;
};

const CPF_PATTERN = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
const DATE_PATTERN = /\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/;

const LABEL_PATTERNS: { field: keyof FullParsedResearch["scalars"]; regex: RegExp }[] = [
  { field: "cpf", regex: /\bcpf\s*:?\s*([\d.\-/]+)/i },
  { field: "name", regex: /\bnome\s*:?\s*(.+?)$/i },
  { field: "birthDate", regex: /\b(?:data\s+de\s+nascimento|nascimento|nasc\.?)\s*:?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i },
  { field: "deathDate", regex: /\b(?:data\s+(?:de\s+)?óbito|data\s+obito|falecimento)\s*:?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i },
  { field: "obito", regex: /\b(?:óbito|obito)\s*:?\s*(sim|não|nao|s|n)\b/i },
  { field: "cod", regex: /\b(?:cod|código|codigo)\s*:?\s*(\S+)/i },
];

function formatCpf(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (d.length !== 11) return null;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function normalizeDate(raw: string): string | null {
  const m = raw.trim().match(DATE_PATTERN);
  if (!m) return null;
  const day = m[1].padStart(2, "0");
  const month = m[2].padStart(2, "0");
  let year = m[3];
  if (year.length === 2) year = Number(year) > 30 ? `19${year}` : `20${year}`;
  return `${day}/${month}/${year}`;
}

function normalizeObito(raw: string): string | null {
  const v = raw.trim().toLowerCase();
  if (["sim", "s", "yes"].includes(v)) return "Sim";
  if (["não", "nao", "n", "no"].includes(v)) return "Não";
  return raw.trim() || null;
}

function categoryRank(category: DataCategory): number {
  if (category === "cliente") return 0;
  if (category === "outros") return 1;
  return 2;
}

function isEmpty(snapshot: ClientSnapshot, key: string): boolean {
  return !String(snapshot[key] ?? "").trim();
}

export function parseFullResearchText(text: string): FullParsedResearch {
  const parsed = parseResearchText(text);
  const scalars: FullParsedResearch["scalars"] = {
    cpf: null,
    name: null,
    birthDate: null,
    deathDate: null,
    obito: null,
    cod: null,
  };

  const lines = text.replace(/\r\n/g, "\n").split("\n").map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    for (const { field, regex } of LABEL_PATTERNS) {
      if (scalars[field]) continue;
      const match = line.match(regex);
      if (!match) continue;
      const raw = match[1].trim();
      if (field === "cpf") scalars.cpf = formatCpf(raw);
      else if (field === "birthDate" || field === "deathDate") scalars[field] = normalizeDate(raw);
      else if (field === "obito") scalars.obito = normalizeObito(raw);
      else if (field === "name") scalars.name = raw.slice(0, 120);
      else scalars.cod = raw.slice(0, 40);
    }
  }

  if (!scalars.cpf) {
    const cpfMatch = text.match(CPF_PATTERN);
    if (cpfMatch?.[0]) scalars.cpf = formatCpf(cpfMatch[0]);
  }

  return { ...parsed, scalars };
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
  const working = { ...snapshot };

  const scalarMap: (keyof FullParsedResearch["scalars"])[] = [
    "cod",
    "name",
    "cpf",
    "birthDate",
    "obito",
    "deathDate",
  ];

  for (const key of scalarMap) {
    const value = parsed.scalars[key];
    if (!value || !isEmpty(working, key)) continue;
    fields[key] = value;
    working[key] = value;
    filledFields.push(key);
  }

  const phones = [...parsed.phones]
    .filter((p) => options?.includeAutorPhones || p.category !== "autor")
    .sort((a, b) => categoryRank(a.category) - categoryRank(b.category));

  for (const phone of phones) {
    const already = PHONE_FIELD_KEYS.find(
      (key) => String(working[key] ?? "").replace(/\D/g, "") === phone.digits
    );
    if (already) continue;

    const slot = nextEmptyPhoneSlot(working);
    if (!slot) break;

    fields[slot] = phone.value;
    working[slot] = phone.value;
    filledFields.push(slot);
    phoneChecks.push({ phoneKey: slot, phoneNumber: phone.value, result: "VALIDO" });
  }

  const addresses = [...parsed.addresses]
    .filter((a) => a.category !== "autor")
    .sort((a, b) => categoryRank(a.category) - categoryRank(b.category));

  for (const address of addresses) {
    const dup = ["address1", "address2", "address3"].some(
      (key) => String(working[key] ?? "").toLowerCase() === address.value.toLowerCase()
    );
    if (dup) continue;

    const slot = nextEmptyAddressSlot(working);
    if (!slot) break;

    fields[slot] = address.value;
    working[slot] = address.value;
    filledFields.push(slot);
  }

  return { fields, phoneChecks, filledFields, parsed };
}
