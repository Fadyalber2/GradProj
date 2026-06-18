import { test, expect } from "@playwright/test";

test("login with valid credentials lands on dashboard", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Email Address").fill(process.env.TEST_USER_EMAIL!);
  await page.locator('input[name="password"]').fill(process.env.TEST_USER_PASSWORD!);
  await page.getByRole("button", { name: "Log In" }).click();

  await page.waitForURL("/dashboard", { timeout: 15_000 });

  // Dashboard heading confirms the page rendered
  await expect(
    page.getByRole("heading", { name: "Manage your AXIOM workspace." })
  ).toBeVisible({ timeout: 15_000 });

  expect(page.url()).toContain("/dashboard");
});

test("login with wrong password shows error message", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Email Address").fill(process.env.TEST_USER_EMAIL!);
  await page.locator('input[name="password"]').fill("wrongpassword_xyz");
  await page.getByRole("button", { name: "Log In" }).click();

  await expect(page.locator("text=/invalid|incorrect|failed/i").first()).toBeVisible({ timeout: 8_000 });
  expect(page.url()).not.toContain("/dashboard");
});
