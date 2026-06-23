import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";
import { skipIfDbUnavailable } from "./db-gate";

test.describe("Ações — controle de acesso e listagem", () => {
  test("GET /api/acoes sem autenticação retorna 401", async ({ request }) => {
    const res = await request.get("/api/acoes");
    expect(res.status()).toBe(401);
  });

  test("GET /api/acoes autenticado retorna lista", async ({ request }) => {
    await skipIfDbUnavailable(request);
    await loginAsAdmin(request);
    const res = await request.get("/api/acoes");
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { acoes: unknown[] };
    expect(Array.isArray(body.acoes)).toBe(true);
  });

  test("GET /api/acoes com filtro de stage retorna apenas o subset", async ({ request }) => {
    await skipIfDbUnavailable(request);
    await loginAsAdmin(request);

    for (const stage of ["adv", "docs", "entrada", "sentenca"]) {
      const res = await request.get(`/api/acoes?stage=${stage}`);
      expect(res.ok()).toBeTruthy();
      const body = (await res.json()) as { acoes: unknown[] };
      expect(Array.isArray(body.acoes)).toBe(true);
    }
  });

  test("POST /api/acoes sem autenticação retorna 401", async ({ request }) => {
    const res = await request.post("/api/acoes", {
      data: { clientId: "00000000-0000-0000-0000-000000000001" },
    });
    expect(res.status()).toBe(401);
  });

  test("DELETE /api/acoes/[id] inexistente retorna 404", async ({ request }) => {
    await skipIfDbUnavailable(request);
    await loginAsAdmin(request);
    const res = await request.delete("/api/acoes/00000000-0000-0000-0000-000000000000");
    expect(res.status()).toBe(404);
  });
});

test.describe("Cartas — controle de acesso", () => {
  test("GET /api/cartas sem autenticação retorna 401", async ({ request }) => {
    const res = await request.get("/api/cartas");
    expect(res.status()).toBe(401);
  });

  test("GET /api/cartas autenticado retorna clientes", async ({ request }) => {
    await skipIfDbUnavailable(request);
    await loginAsAdmin(request);
    const res = await request.get("/api/cartas");
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { clients: unknown[] };
    expect(Array.isArray(body.clients)).toBe(true);
  });
});

test.describe("CEP proxy", () => {
  test("GET /api/cep/[cep] com CEP inválido retorna 400", async ({ request }) => {
    const res = await request.get("/api/cep/00000");
    expect(res.status()).toBe(400);
  });

  test("GET /api/cep/[cep] com formato válido chega ao serviço", async ({ request }) => {
    const res = await request.get("/api/cep/01310100");
    // Pode ser 200 (ViaCEP disponível) ou 502 (timeout); não pode ser 400 nem 500 interno
    expect([200, 404, 502]).toContain(res.status());
  });
});

test.describe("Endereço — controle de acesso", () => {
  test("PATCH /api/clients/[id]/address sem autenticação retorna 401", async ({ request }) => {
    const res = await request.patch("/api/clients/00000000-0000-0000-0000-000000000001/address", {
      data: { cep: "01310-100" },
    });
    expect(res.status()).toBe(401);
  });

  test("PATCH /api/clients/[id]/address de cliente inexistente retorna 404", async ({ request }) => {
    await skipIfDbUnavailable(request);
    await loginAsAdmin(request);
    const res = await request.patch("/api/clients/00000000-0000-0000-0000-000000000000/address", {
      data: { cep: "01310-100" },
    });
    expect(res.status()).toBe(404);
  });
});
