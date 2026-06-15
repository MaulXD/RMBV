import type { ClientStatus, ClientWorkflowStatus } from "@prisma/client";

export const CSV_HEADERS = [
  "COD",
  "TESE",
  "NOME",
  "CPF",
  "DATA DE NASCIMENTO",
  "ÓBITO",
  "DATA ÓBITO",
  "TELEFONE 1",
  "TELEFONE 2",
  "TELEFONE 3",
  "TELEFONE 4",
  "TELEFONE 5",
  "TELEFONE 6",
  "TELEFONE 7",
  "TELEFONE 8",
  "TELEFONE 9",
  "TELEFONE 10",
  "ENDERECO 1",
  "ENDERECO 2",
  "ENDERECO 3",
] as const;

export const PHONE_FIELD_KEYS = [
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
] as const;

export type PhoneFieldKey = (typeof PHONE_FIELD_KEYS)[number];

export function countVisiblePhones(values: ClientFormFieldValues): number {
  let lastFilled = 0;
  PHONE_FIELD_KEYS.forEach((key, index) => {
    const v = values[key];
    if (v != null && String(v).trim()) lastFilled = index + 1;
  });
  const withEmpty = lastFilled < 10 ? lastFilled + 1 : 10;
  return Math.min(10, Math.max(1, withEmpty));
}

export const CLIENT_FIELD_GROUPS = [
  {
    title: "Identificação",
    fields: [
      { key: "cod", label: "COD" },
      { key: "name", label: "NOME" },
      { key: "cpf", label: "CPF" },
      { key: "birthDate", label: "DATA DE NASCIMENTO" },
    ],
  },
  {
    title: "Óbito",
    fields: [
      { key: "obito", label: "ÓBITO" },
      { key: "deathDate", label: "DATA ÓBITO" },
    ],
  },
  {
    title: "Telefones",
    fields: Array.from({ length: 10 }, (_, i) => ({
      key: `phone${i + 1}`,
      label: `TELEFONE ${i + 1}`,
    })),
  },
  {
    title: "Endereços",
    fields: [
      { key: "address1", label: "ENDERECO 1" },
      { key: "address2", label: "ENDERECO 2" },
      { key: "address3", label: "ENDERECO 3" },
    ],
  },
] as const;

export const WORKFLOW_OPTIONS: { value: ClientWorkflowStatus; label: string }[] = [
  { value: "EM_ANDAMENTO", label: "Em andamento" },
  { value: "FINALIZACAO_SOLICITADA", label: "Finalização solicitada" },
  { value: "FINALIZADO", label: "Finalizado" },
];

export const STATUS_OPTIONS: { value: ClientStatus; label: string }[] = [
  { value: "AGUARDANDO", label: "Aguardando" },
  { value: "LOCALIZADO", label: "Localizado" },
  { value: "SEM_SUCESSO", label: "Sem Sucesso" },
  { value: "TENTE_NOVAMENTE", label: "Tente novamente" },
];

export type ClientProfileData = {
  id: string;
  cod: string | null;
  teseId: string | null;
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
  status: ClientStatus;
  workflowStatus: ClientWorkflowStatus;
  finalizationRequestedAt: string | null;
  finalizationRequestedBy: { id: string; name: string; email: string } | null;
  finalizedAt: string | null;
  finalizedBy: { id: string; name: string; email: string } | null;
  pesquisa: string | null;
  createdAt: string;
  updatedAt: string;
  categories: { id: string; name: string }[];
};

export function clientToExportRow(client: ClientProfileData) {
  return {
    COD: client.cod ?? "",
    TESE: client.tese ?? "",
    NOME: client.name,
    CPF: client.cpf ?? "",
    "DATA DE NASCIMENTO": client.birthDate ?? "",
    ÓBITO: client.obito ?? "",
    "DATA ÓBITO": client.deathDate ?? "",
    "TELEFONE 1": client.phone1 ?? "",
    "TELEFONE 2": client.phone2 ?? "",
    "TELEFONE 3": client.phone3 ?? "",
    "TELEFONE 4": client.phone4 ?? "",
    "TELEFONE 5": client.phone5 ?? "",
    "TELEFONE 6": client.phone6 ?? "",
    "TELEFONE 7": client.phone7 ?? "",
    "TELEFONE 8": client.phone8 ?? "",
    "TELEFONE 9": client.phone9 ?? "",
    "TELEFONE 10": client.phone10 ?? "",
    "ENDERECO 1": client.address1 ?? "",
    "ENDERECO 2": client.address2 ?? "",
    "ENDERECO 3": client.address3 ?? "",
    STATUS: STATUS_OPTIONS.find((s) => s.value === client.status)?.label ?? client.status,
    "STATUS WORKFLOW":
      WORKFLOW_OPTIONS.find((s) => s.value === client.workflowStatus)?.label ??
      client.workflowStatus,
  };
}

export type ClientFormFieldValues = {
  cod: string | null;
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

export type ClientFormValues = {
  cod: string;
  name: string;
  cpf: string;
  birthDate: string;
  obito: string;
  deathDate: string;
  phone1: string;
  phone2: string;
  phone3: string;
  phone4: string;
  phone5: string;
  phone6: string;
  phone7: string;
  phone8: string;
  phone9: string;
  phone10: string;
  address1: string;
  address2: string;
  address3: string;
  status: ClientStatus;
};

export function createEmptyClientForm(): ClientFormValues {
  return {
    cod: "",
    name: "",
    cpf: "",
    birthDate: "",
    obito: "",
    deathDate: "",
    phone1: "",
    phone2: "",
    phone3: "",
    phone4: "",
    phone5: "",
    phone6: "",
    phone7: "",
    phone8: "",
    phone9: "",
    phone10: "",
    address1: "",
    address2: "",
    address3: "",
    status: "AGUARDANDO",
  };
}

const NULLABLE_FORM_KEYS = [
  "cod",
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

export function formValuesToCreatePayload(
  form: ClientFormValues,
  extras?: { teseId?: string | null }
) {
  const payload: Record<string, string | null | ClientStatus> = {
    name: form.name.trim(),
    status: form.status,
    teseId: extras?.teseId ?? null,
  };

  for (const key of NULLABLE_FORM_KEYS) {
    const value = form[key].trim();
    payload[key] = value || null;
  }

  return payload;
}

export function formatClientForApi(
  client: {
    id: string;
    cod: string | null;
    teseId: string | null;
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
    status: ClientStatus;
    workflowStatus: ClientWorkflowStatus;
    finalizationRequestedAt: Date | null;
    finalizationRequestedBy?: { id: string; name: string; email: string } | null;
    finalizedAt: Date | null;
    finalizedBy?: { id: string; name: string; email: string } | null;
    pesquisa: string | null;
    createdAt: Date;
    updatedAt: Date;
    categories: { category: { id: string; name: string } }[];
    teseRef?: { id: string; name: string; color: string | null } | null;
  }
): ClientProfileData {
  return {
    id: client.id,
    cod: client.cod,
    teseId: client.teseId,
    tese: client.teseRef?.name ?? client.tese,
    name: client.name,
    cpf: client.cpf,
    birthDate: client.birthDate,
    obito: client.obito,
    deathDate: client.deathDate,
    phone1: client.phone1,
    phone2: client.phone2,
    phone3: client.phone3,
    phone4: client.phone4,
    phone5: client.phone5,
    phone6: client.phone6,
    phone7: client.phone7,
    phone8: client.phone8,
    phone9: client.phone9,
    phone10: client.phone10,
    address1: client.address1,
    address2: client.address2,
    address3: client.address3,
    status: client.status,
    workflowStatus: client.workflowStatus,
    finalizationRequestedAt: client.finalizationRequestedAt?.toISOString() ?? null,
    finalizationRequestedBy: client.finalizationRequestedBy ?? null,
    finalizedAt: client.finalizedAt?.toISOString() ?? null,
    finalizedBy: client.finalizedBy ?? null,
    pesquisa: client.pesquisa,
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString(),
    categories: client.categories.map((c) => ({
      id: c.category.id,
      name: c.category.name,
    })),
  };
}
