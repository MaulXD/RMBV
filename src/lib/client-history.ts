import type {
  ClientHistoryType,
  ClientStatus,
  PhoneCheckResult,
} from "@prisma/client";
import { STATUS_OPTIONS } from "./client-fields";

export const PHONE_CHECK_LABELS: Record<PhoneCheckResult, string> = {
  VALIDO: "Número válido",
  INVALIDO: "Número inválido",
  NAO_ATENDE: "Ninguém atende",
};

export const COMMUNICATION_LABELS: Record<"CALL" | "WHATSAPP" | "NOTE", string> = {
  CALL: "Ligação",
  WHATSAPP: "WhatsApp",
  NOTE: "Nota livre",
};

export function communicationTypeLabel(type: ClientHistoryType): string | null {
  if (type === "CALL" || type === "WHATSAPP" || type === "NOTE") {
    return COMMUNICATION_LABELS[type];
  }
  return null;
}

export const PHONE_KEY_REGEX = /^phone(10|[1-9])$/;

export function isPhoneFieldKey(key: string): boolean {
  return PHONE_KEY_REGEX.test(key);
}

export function statusLabel(status: ClientStatus): string {
  return STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
}

export type ClientHistoryEntry = {
  id: string;
  type: ClientHistoryType;
  createdAt: string;
  createdBy: { id: string; name: string; email: string };
  fromStatus: ClientStatus | null;
  toStatus: ClientStatus | null;
  note: string | null;
  phoneKey: string | null;
  phoneNumber: string | null;
  phoneCheck: PhoneCheckResult | null;
};

export function formatHistoryEntry(row: {
  id: string;
  type: ClientHistoryType;
  createdAt: Date;
  createdBy: { id: string; name: string; email: string };
  fromStatus: ClientStatus | null;
  toStatus: ClientStatus | null;
  note: string | null;
  phoneKey: string | null;
  phoneNumber: string | null;
  phoneCheck: PhoneCheckResult | null;
}): ClientHistoryEntry {
  return {
    id: row.id,
    type: row.type,
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy,
    fromStatus: row.fromStatus,
    toStatus: row.toStatus,
    note: row.note,
    phoneKey: row.phoneKey,
    phoneNumber: row.phoneNumber,
    phoneCheck: row.phoneCheck,
  };
}

export function latestPhoneChecksFromHistory(
  entries: ClientHistoryEntry[]
): Partial<Record<string, PhoneCheckResult>> {
  const map: Partial<Record<string, PhoneCheckResult>> = {};
  for (const entry of entries) {
    if (entry.type !== "PHONE_CHECK" || !entry.phoneKey || !entry.phoneCheck) continue;
    if (!map[entry.phoneKey]) {
      map[entry.phoneKey] = entry.phoneCheck;
    }
  }
  return map;
}

export function historyEntryTitle(entry: ClientHistoryEntry): string {
  const comm = communicationTypeLabel(entry.type);
  if (comm) return comm;
  if (entry.type === "STATUS_CHANGE" && entry.toStatus) {
    const from = entry.fromStatus ? statusLabel(entry.fromStatus) : "—";
    const to = statusLabel(entry.toStatus);
    return `Status: ${from} → ${to}`;
  }
  if (entry.type === "PHONE_CHECK" && entry.phoneKey && entry.phoneCheck) {
    const label = entry.phoneKey.replace("phone", "Telefone ");
    return `${label}: ${PHONE_CHECK_LABELS[entry.phoneCheck]}`;
  }
  return "Registro";
}
