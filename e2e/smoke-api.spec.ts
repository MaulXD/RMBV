import { test, expect } from "@playwright/test";
import { adminCredentials, fakeDescriptor, loginAsAdmin } from "./helpers";
import { skipIfDbUnavailable } from "./db-gate";

test.describe("API autenticada", () => {
  test("admin cria cliente via API", async ({ request }) => {
    await skipIfDbUnavailable(request);
    await loginAsAdmin(request);

    const categoriesRes = await request.get("/api/categories");
    expect(categoriesRes.ok()).toBeTruthy();
    const { categories } = (await categoriesRes.json()) as {
      categories: Array<{ id: string; name: string }>;
    };
    expect(categories.length).toBeGreaterThan(0);

    const teamsRes = await request.get("/api/teams");
    expect(teamsRes.ok()).toBeTruthy();
    const { teams } = (await teamsRes.json()) as {
      teams: Array<{ id: string }>;
    };

    const unique = `E2E ${Date.now()}`;
    const createRes = await request.post("/api/clients", {
      data: {
        name: unique,
        categoryId: categories[0]!.id,
        teamId: teams[0]?.id ?? null,
        status: "AGUARDANDO",
      },
    });
    expect(createRes.status()).toBe(201);

    const created = (await createRes.json()) as { client: { id: string; name: string } };
    expect(created.client.name).toBe(unique);
  });

  test("GET /api/auth/me retorna usuário logado", async ({ request }) => {
    await skipIfDbUnavailable(request);
    const user = await loginAsAdmin(request);
    const meRes = await request.get("/api/auth/me");
    expect(meRes.ok()).toBeTruthy();
    const me = (await meRes.json()) as { user: { id: string; role: string } };
    expect(me.user.id).toBe(user.id);
    expect(me.user.role).toBe("ADMIN");
  });
});

test.describe("Segurança do ponto (Sprint 1)", () => {
  test("POST /api/ponto exige descritor facial", async ({ request }) => {
    await skipIfDbUnavailable(request);
    const user = await loginAsAdmin(request);

    const res = await request.post("/api/ponto", {
      data: {
        userId: user.id,
        type: "ENTRADA",
        origin: "MOBILE",
      },
    });
    expect(res.status()).toBe(400);
  });

  test("POST /api/ponto rejeita descritor que não confere", async ({ request }) => {
    await skipIfDbUnavailable(request);
    const user = await loginAsAdmin(request);

    const res = await request.post("/api/ponto", {
      data: {
        userId: user.id,
        type: "ENTRADA",
        origin: "MOBILE",
        descriptor: fakeDescriptor(0.5),
      },
    });
    expect(res.status()).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/não reconhecido|cadastro facial/i);
  });

  test("GET /api/ponto/faces não é público sem autenticação", async ({ request }) => {
    const res = await request.get("/api/ponto/faces?teamId=00000000-0000-0000-0000-000000000001");
    expect(res.status()).toBe(401);
  });

  test("GET /api/ponto/faces autenticado retorna descontinuado", async ({ request }) => {
    await skipIfDbUnavailable(request);
    await loginAsAdmin(request);
    const res = await request.get("/api/ponto/faces?teamId=00000000-0000-0000-0000-000000000001");
    expect(res.status()).toBe(410);
  });

  test("POST /api/ponto/match exige chave do quiosque", async ({ request }) => {
    const res = await request.post("/api/ponto/match", {
      data: {
        teamId: "00000000-0000-0000-0000-000000000001",
        descriptor: fakeDescriptor(),
      },
    });
    expect(res.status()).toBe(401);
  });
});
