import type { APIRequestContext } from "@playwright/test";

export const adminCredentials = {
  login: process.env.E2E_ADMIN_LOGIN ?? "Admin",
  password: process.env.E2E_ADMIN_PASSWORD ?? process.env.ADMIN_PASSWORD ?? "rmbvadmin",
};

/** Login via API e retorna contexto com cookie de sessão. */
export async function loginAsAdmin(request: APIRequestContext) {
  const res = await request.post("/api/auth/login", {
    data: adminCredentials,
  });
  if (!res.ok()) {
    const body = await res.text();
    throw new Error(`Login falhou (${res.status()}): ${body}`);
  }
  const data = (await res.json()) as { user: { id: string; role: string } };
  return data.user;
}

/** Descritor facial fake (128D) para testes de API — não passa validação real. */
export function fakeDescriptor(fill = 0): number[] {
  return Array.from({ length: 128 }, () => fill);
}
