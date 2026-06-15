export type DataCategory = "cliente" | "autor" | "outros";

export type ExtractedPhone = {
  id: string;
  value: string;
  digits: string;
  category: DataCategory;
  context: string;
};

export type ExtractedAddress = {
  id: string;
  value: string;
  category: DataCategory;
  context: string;
};

export type ParsedResearch = {
  phones: ExtractedPhone[];
  addresses: ExtractedAddress[];
  summary: {
    phonesCliente: number;
    phonesAutor: number;
    addressesCliente: number;
    addressesAutor: number;
  };
};

const AUTOR_MARKERS =
  /\b(autor(?:a|es)?|requerente|de\s+cujus|esp[oó]lio|falecid[oa]|inventariad[oa]|inventariante)\b/i;
const CLIENT_MARKERS =
  /\b(r[eé]u|requerid[oa]|herdeir[oa]|cliente|inventariad[oa]\s+nominal|benefici[aá]ri[oa])\b/i;
const ADDRESS_START =
  /\b(rua|av\.?|avenida|travessa|alameda|rodovia|estrada|pra[cç]a|largo|condom[ií]nio|residencial|s\/n|cep)\b/i;
const CEP_PATTERN = /\b\d{5}-?\d{3}\b/;

const PHONE_PATTERNS = [
  /(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?(?:9\s*)?\d{4,5}[-\s]?\d{4}\b/g,
  /\b\d{2}\s+\d{4,5}[-\s]?\d{4}\b/g,
  /\b\d{10,11}\b/g,
];

function normalizeDigits(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return digits.slice(2);
  return digits;
}

export function formatBrazilPhone(digits: string): string {
  const d = normalizeDigits(digits);
  if (d.length === 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  if (d.length === 11) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  return digits;
}

function isValidPhoneDigits(digits: string): boolean {
  const d = normalizeDigits(digits);
  if (d.length < 10 || d.length > 11) return false;
  const ddd = Number(d.slice(0, 2));
  if (ddd < 11 || ddd > 99) return false;
  if (d.length === 11 && d[2] !== "9") return false;
  return true;
}

function classifyLine(line: string, blockCategory: DataCategory): DataCategory {
  if (AUTOR_MARKERS.test(line)) return "autor";
  if (CLIENT_MARKERS.test(line)) return "cliente";
  return blockCategory;
}

function classifyBlock(lines: string[]): DataCategory {
  const joined = lines.join(" ");
  if (AUTOR_MARKERS.test(joined) && !CLIENT_MARKERS.test(joined)) return "autor";
  if (CLIENT_MARKERS.test(joined) && !AUTOR_MARKERS.test(joined)) return "cliente";
  if (AUTOR_MARKERS.test(joined)) return "autor";
  return "outros";
}

function extractPhonesFromLine(
  line: string,
  category: DataCategory,
  seen: Set<string>
): ExtractedPhone[] {
  const found: ExtractedPhone[] = [];

  for (const pattern of PHONE_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(line)) !== null) {
      const raw = match[0].trim();
      const digits = normalizeDigits(raw);
      if (!isValidPhoneDigits(digits) || seen.has(digits)) continue;
      seen.add(digits);
      found.push({
        id: `phone-${digits}`,
        value: formatBrazilPhone(digits),
        digits,
        category,
        context: line.trim().slice(0, 160),
      });
    }
  }

  return found;
}

function looksLikeAddress(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 12) return false;
  if (CEP_PATTERN.test(trimmed)) return true;
  if (ADDRESS_START.test(trimmed)) return true;
  if (/\b(n[º°o]\s*\d+|,\s*\d+)\b/i.test(trimmed) && ADDRESS_START.test(trimmed)) return true;
  return false;
}

function mergeAddressLines(lines: string[], startIndex: number): { value: string; consumed: number } {
  const parts = [lines[startIndex].trim()];
  let consumed = 1;

  while (startIndex + consumed < lines.length) {
    const next = lines[startIndex + consumed].trim();
    if (!next) break;
    if (AUTOR_MARKERS.test(next) || CLIENT_MARKERS.test(next)) break;
    if (extractPhonesFromLine(next, "outros", new Set()).length > 0 && !CEP_PATTERN.test(next)) break;
    if (looksLikeAddress(next) || CEP_PATTERN.test(next) || parts.join(" ").length < 80) {
      parts.push(next);
      consumed += 1;
      if (CEP_PATTERN.test(next)) break;
      continue;
    }
    break;
  }

  return { value: parts.join(", ").replace(/\s+/g, " ").trim(), consumed };
}

export function parseResearchText(text: string): ParsedResearch {
  const phones: ExtractedPhone[] = [];
  const addresses: ExtractedAddress[] = [];
  const seenPhones = new Set<string>();
  const seenAddresses = new Set<string>();

  const blocks = text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((b) => b.split("\n").map((l) => l.trim()).filter(Boolean))
    .filter((b) => b.length > 0);

  const lines =
    blocks.length > 0
      ? blocks.flatMap((block) => {
          const blockCategory = classifyBlock(block);
          return block.map((line) => ({ line, blockCategory }));
        })
      : text
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
          .map((line) => ({ line, blockCategory: "outros" as DataCategory }));

  for (let i = 0; i < lines.length; i += 1) {
    const { line, blockCategory } = lines[i];
    const category = classifyLine(line, blockCategory);

    phones.push(...extractPhonesFromLine(line, category, seenPhones));

    if (looksLikeAddress(line)) {
      const merged = mergeAddressLines(
        lines.map((l) => l.line),
        i
      );
      const key = merged.value.toLowerCase();
      if (!seenAddresses.has(key) && merged.value.length >= 12) {
        seenAddresses.add(key);
        addresses.push({
          id: `addr-${addresses.length + 1}`,
          value: merged.value,
          category,
          context: line.slice(0, 160),
        });
      }
      i += merged.consumed - 1;
    }
  }

  return {
    phones,
    addresses,
    summary: {
      phonesCliente: phones.filter((p) => p.category === "cliente").length,
      phonesAutor: phones.filter((p) => p.category === "autor").length,
      addressesCliente: addresses.filter((a) => a.category === "cliente").length,
      addressesAutor: addresses.filter((a) => a.category === "autor").length,
    },
  };
}

export function nextEmptyPhoneSlot(
  values: Record<string, string | null | undefined>
): string | null {
  for (let i = 1; i <= 10; i += 1) {
    const key = `phone${i}`;
    if (!String(values[key] ?? "").trim()) return key;
  }
  return null;
}

export function nextEmptyAddressSlot(
  values: Record<string, string | null | undefined>
): string | null {
  for (let i = 1; i <= 3; i += 1) {
    const key = `address${i}`;
    if (!String(values[key] ?? "").trim()) return key;
  }
  return null;
}
