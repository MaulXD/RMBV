import { NextResponse } from "next/server";
import { getSessionUser } from "./auth";
import {
  PermissionDeniedError,
  UnauthorizedError,
  type PermissionAction,
  assertCategoryPermission,
} from "./permissions";
import type { SessionUser } from "./auth";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export async function withAuth(
  handler: (user: SessionUser) => Promise<NextResponse>
) {
  try {
    const user = await requireAuth();
    return await handler(user);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return jsonError(err.message, 401);
    }
    if (err instanceof PermissionDeniedError) {
      return jsonError(err.message, 403);
    }
    console.error(err);
    return jsonError("Erro interno do servidor", 500);
  }
}

export async function withCategoryAuth(
  categoryId: string,
  action: PermissionAction,
  handler: (user: SessionUser) => Promise<NextResponse>
) {
  return withAuth(async (user) => {
    await assertCategoryPermission(user, categoryId, action);
    return handler(user);
  });
}
