import { test as setup, expect } from "@playwright/test";
import path from "path";

const AUTH_FILE = path.resolve("playwright/.auth/user.json");

setup("authenticate as regular user", async ({ page }) => {
  await page.goto("/login", { timeout: 10_000 });

  try {
    await page.getByLabel("Email Address").fill(process.env.TEST_USER_EMAIL!, { timeout: 5_000 });
    await page.locator('input[name="password"]').fill(process.env.TEST_USER_PASSWORD!, { timeout: 5_000 });
    await page.getByRole("button", { name: "Log In" }).click({ timeout: 5_000 });

    await page.waitForURL("/dashboard", { timeout: 15_000 });
    await expect(page.getByText("Manage your AXIOM workspace").or(page.locator("h1"))).toBeVisible({ timeout: 10_000 });
  } catch (error) {
    console.error("User setup failed:", error);
    await page.context().storageState({ path: AUTH_FILE });
    throw error;
  }

  await page.context().storageState({ path: AUTH_FILE });
});
