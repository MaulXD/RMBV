import { Role } from "@prisma/client";
import type { SessionUser } from "./auth";

const ROLE_RANK: Record<Role, number> = {
  PESQUISADOR: 1,
  COLABORADOR: 2,
  SUPORTE: 3,
  GERENTE: 4,
  ADV: 5,
  TI: 6,
  ADMIN: 7,
};

export const ROLE_LABELS: Record<Role, string> = {
  PESQUISADOR: "Pesquisador",
  COLABORADOR: "Colaborador",
  SUPORTE: "Suporte",
  GERENTE: "Gerente",
  ADV: "ADV",
  TI: "TI",
  ADMIN: "Administrador",
};

export function roleRank(role: Role) {
  return ROLE_RANK[role];
}

export function isGerenteOrAbove(user: SessionUser) {
  return roleRank(user.role) >= ROLE_RANK.GERENTE;
}

/** TI has full system access equal to ADMIN */
export function isAdminOrTI(role: Role | string) {
  return role === Role.ADMIN || role === Role.TI || role === "ADMIN" || role === "TI";
}

/** Suporte and TI — access to TI modules (chamados, kanban, relatórios) */
export function isTIOrSuporte(role: Role | string) {
  return (
    role === Role.TI || role === Role.SUPORTE || role === Role.ADMIN ||
    role === "TI" || role === "SUPORTE" || role === "ADMIN"
  );
}

export function canFinalizeClients(user: SessionUser) {
  return isGerenteOrAbove(user);
}

/** Ferramentas (PDF, validadores, etc.) — disponível para todos os usuários autenticados. */
export function canAccessTools(user: { role: Role | string }) {
  return Boolean(user.role);
}

/** Editar modelo de checklist por tese. */
export function canManageChecklistTemplate(user: { role: Role | string }) {
  return (
    user.role === Role.ADMIN ||
    user.role === Role.ADV ||
    user.role === Role.GERENTE ||
    user.role === Role.TI ||
    user.role === "ADMIN" ||
    user.role === "ADV" ||
    user.role === "GERENTE" ||
    user.role === "TI"
  );
}
