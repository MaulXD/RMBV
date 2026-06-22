import { test, type APIRequestContext } from "@playwright/test";

/** Pula o teste quando o banco/seed não estão prontos (ex.: sem DATABASE_URL local). */
export async function skipIfDbUnavailable(request: APIRequestContext) {
  const res = await request.get("/api/health");
  const body = (await res.json()) as { ok?: boolean; checks?: Record<string, string> };
  test.skip(
    !body.ok,
    `E2E requer DATABASE_URL + seed. checks=${JSON.stringify(body.checks ?? {})}`,
  );
}
