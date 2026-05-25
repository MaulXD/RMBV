import { Role } from "@prisma/client";
import type { SessionUser } from "./auth";

export function isAdmin(user: SessionUser) {
  return user.role === Role.ADMIN;
}

export function requireAdmin(user: SessionUser) {
  if (!isAdmin(user)) {
    throw new Error("Acesso restrito a administradores");
  }
}
