import { normalizeCpf } from "./cpf-utils";

export type DocValidationResult = {
  input: string;
  kind: "CPF" | "CNPJ" | "INVALID";
  valid: boolean;
  normalized: string | null;
  message: string;
};

function allSameDigits(digits: string) {
  return /^(\d)\1+$/.test(digits);
}

function calcCheckDigit(digits: string, weights: number[]) {
  const sum = weights.reduce((acc, w, i) => acc + Number(digits[i]) * w, 0);
  const mod = sum % 11;
  return mod < 2 ? 0 : 11 - mod;
}

export function isValidCpf(value: string): boolean {
  const digits = normalizeCpf(value);
  if (!digits || digits.length !== 11 || allSameDigits(digits)) return false;
  const d1 = calcCheckDigit(digits, [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calcCheckDigit(digits, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return digits.endsWith(`${d1}${d2}`);
}

export function isValidCnpj(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 14 || allSameDigits(digits)) return false;
  const d1 = calcCheckDigit(digits, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calcCheckDigit(digits, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return digits.endsWith(`${d1}${d2}`);
}

export function validateDocumentLine(line: string): DocValidationResult {
  const trimmed = line.trim();
  if (!trimmed) {
    return { input: line, kind: "INVALID", valid: false, normalized: null, message: "Linha vazia" };
  }

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 11) {
    const valid = isValidCpf(trimmed);
    return {
      input: trimmed,
      kind: "CPF",
      valid,
      normalized: digits,
      message: valid ? "CPF válido" : "CPF inválido",
    };
  }

  if (digits.length === 14) {
    const valid = isValidCnpj(trimmed);
    return {
      input: trimmed,
      kind: "CNPJ",
      valid,
      normalized: digits,
      message: valid ? "CNPJ válido" : "CNPJ inválido",
    };
  }

  return {
    input: trimmed,
    kind: "INVALID",
    valid: false,
    normalized: null,
    message: "Use 11 (CPF) ou 14 (CNPJ) dígitos",
  };
}

export function validateDocumentBatch(text: string): DocValidationResult[] {
  return text
    .split(/\r?\n/)
    .map((line) => validateDocumentLine(line))
    .filter((r) => r.input.trim().length > 0);
}
