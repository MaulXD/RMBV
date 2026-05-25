import { Role } from "@prisma/client";
import { prisma } from "./prisma";
import type { SessionUser } from "./auth";

export type PermissionAction = "canCreate" | "canRead" | "canUpdate" | "canDelete";

export class PermissionDeniedError extends Error {
  status = 403;
  constructor(message = "Permissão negada para esta categoria") {
    super(message);
    this.name = "PermissionDeniedError";
  }
}

export class UnauthorizedError extends Error {
  status = 401;
  constructor(message = "Não autenticado") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export async function getCategoryPermission(
  role: Role,
  categoryId: string,
  action: PermissionAction
) {
  if (role === Role.ADMIN) return true;

  const permission = await prisma.permission.findUnique({
    where: { role_categoryId: { role, categoryId } },
  });

  if (!permission) return false;
  return permission[action];
}

export async function assertCategoryPermission(
  user: SessionUser,
  categoryId: string,
  action: PermissionAction
) {
  const allowed = await getCategoryPermission(user.role, categoryId, action);
  if (!allowed) throw new PermissionDeniedError();
}

export async function assertAnyCategoryPermission(
  user: SessionUser,
  categoryIds: string[],
  action: PermissionAction
) {
  if (user.role === Role.ADMIN) return;
  if (categoryIds.length === 0) throw new PermissionDeniedError("Categoria obrigatória");

  const checks = await Promise.all(
    categoryIds.map((id) => getCategoryPermission(user.role, id, action))
  );

  if (!checks.some(Boolean)) {
    throw new PermissionDeniedError();
  }
}

export async function getReadableCategoryIds(user: SessionUser) {
  if (user.role === Role.ADMIN) {
    const all = await prisma.category.findMany({ select: { id: true } });
    return all.map((c) => c.id);
  }

  const permissions = await prisma.permission.findMany({
    where: { role: user.role, canRead: true },
    select: { categoryId: true },
  });

  return permissions.map((p) => p.categoryId);
}
