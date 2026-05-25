import { Role } from "@prisma/client";
import type { SessionUser } from "./auth";

const ROLE_RANK: Record<Role, number> = {
  COLABORADOR: 1,
  GERENTE: 2,
  ADV: 3,
  ADMIN: 4,
};

export const ROLE_LABELS: Record<Role, string> = {
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
