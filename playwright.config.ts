import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

/** Fallbacks locais — em CI as variáveis vêm do workflow. */
if (!process.env.JWT_SECRET?.trim()) {
  process.env.JWT_SECRET = "local-e2e-jwt-secret-32-chars-min!!";
}
if (!process.env.KIOSK_API_KEY?.trim()) {
  process.env.KIOSK_API_KEY = "dev-kiosk-key";
}

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: process.env.CI ? "npm run start" : "npm run dev",
    url: `${baseURL}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: {
      ...process.env,
      NODE_ENV: process.env.CI ? "production" : "development",
    },
  },
});
