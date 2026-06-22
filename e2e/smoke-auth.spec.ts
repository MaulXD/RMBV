import { test, expect } from "@playwright/test";
import { adminCredentials } from "./helpers";
import { skipIfDbUnavailable } from "./db-gate";

test.describe("Login", () => {
  test("redireciona admin para o dashboard após login", async ({ page, request }) => {
    await skipIfDbUnavailable(request);
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();

    await page.getByPlaceholder("Login ou e-mail").fill(adminCredentials.login);
    await page.getByPlaceholder("••••••••").fill(adminCredentials.password);
    await page.getByRole("button", { name: "Entrar no sistema" }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Painel de clientes" })).toBeVisible();
  });

  test("rejeita credenciais inválidas", async ({ page, request }) => {
    await skipIfDbUnavailable(request);
    await page.goto("/login");
    await page.getByPlaceholder("Login ou e-mail").fill("usuario-inexistente");
    await page.getByPlaceholder("••••••••").fill("senha-errada");
    await page.getByRole("button", { name: "Entrar no sistema" }).click();

    await expect(page.getByText(/credenciais inválidas|falha no login|usuário inexistente/i)).toBeVisible({
      timeout: 10_000,
    });
    await expect(page).toHaveURL(/\/login/);
  });
});
