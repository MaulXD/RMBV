import { test, expect } from "@playwright/test";

test.describe("API /api/health", () => {
  test("retorna ok quando banco e seed estão configurados", async ({ request }) => {
    const res = await request.get("/api/health");
    const body = (await res.json()) as {
      ok: boolean;
      checks: Record<string, string>;
    };

    test.skip(
      !body.ok,
      `Configure DATABASE_URL e rode npm run db:seed. checks=${JSON.stringify(body.checks)}`,
    );

    expect(res.status()).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.checks.JWT_SECRET).toBe("ok");
    expect(body.checks.DATABASE_URL).toBe("ok");
    expect(body.checks.database).toBe("ok");
    expect(body.checks.users).toMatch(/^ok /);
  });
});
