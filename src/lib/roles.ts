import { Role } from "@prisma/client";
import type { SessionUser } from "./auth";

const ROLE_RANK: Record<Role, number> = {
  PESQUISADOR: 1,
  COLABORADOR: 2,
  GERENTE: 3,
  ADV: 4,
  ADMIN: 5,
};

export const ROLE_LABELS: Record<Role, string> = {
  PESQUISADOR: "Pesquisador",
  COLABORADOR: "Colaborador",
  GERENTE: "Gerente",
  ADV: "ADV",
  ADMIN: "Administrador",
};

export function roleRank(role: Role) {
  return ROLE_RANK[role];
}

export function isGerenteOrAbove(user: SessionUser) {
  return roleRank(user.role) >= ROLE_RANK.GERENTE;
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
    user.role === "ADMIN" ||
    user.role === "ADV" ||
    user.role === "GERENTE"
  );
}
