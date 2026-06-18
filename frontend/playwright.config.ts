import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env.test") });

export const USER_AUTH   = "playwright/.auth/user.json";
export const ADMIN_AUTH  = "playwright/.auth/admin.json";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],
  timeout: 30_000, // Global timeout to prevent hanging tests

  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    headless: false,           // opens real browser window
    slowMo: 300,               // slows actions so you can watch
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },

  projects: [
    // ── Setup (runs first, saves sessions) ───────────────────────────
    {
      name: "user-setup",
      testMatch: "**/setup/user.setup.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "admin-setup",
      testMatch: "**/setup/admin.setup.ts",
      use: { ...devices["Desktop Chrome"] },
    },

    // ── Auth tests (no session — must test unauthenticated state) ────
    {
      name: "auth",
      testMatch: "**/auth/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        storageState: { cookies: [], origins: [] },
      },
    },

    // ── User-authenticated tests ──────────────────────────────────────
    {
      name: "user",
      testMatch: [
        "**/find-homes/**/*.spec.ts",
        "**/property/**/*.spec.ts",
        "**/dashboard/**/*.spec.ts",
        "**/pricing/**/*.spec.ts",
        "**/chatbot/**/*.spec.ts",
      ],
      dependencies: ["user-setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: USER_AUTH,
      },
    },

    // ── Admin-authenticated tests ─────────────────────────────────────
    {
      name: "admin",
      testMatch: "**/admin/**/*.spec.ts",
      dependencies: ["admin-setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: ADMIN_AUTH,
      },
    },
  ],
});
