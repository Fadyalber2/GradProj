import { test, expect } from "@playwright/test";

test("logout clears session and blocks dashboard access", async ({ page }) => {
  // Login first
  await page.goto("/login");
  await page.getByLabel("Email Address").fill(process.env.TEST_USER_EMAIL!);
  await page.locator('input[name="password"]').fill(process.env.TEST_USER_PASSWORD!);
  await page.getByRole("button", { name: "Log In" }).click();
  await page.waitForURL("/dashboard", { timeout: 15_000 });

  // Find and click logout - it's in a dropdown menu
  // First click the user avatar/menu to open dropdown
  await page.getByRole("button", { name: /menu|profile|avatar/i }).or(page.locator("button").filter({ has: page.locator("img") })).first().click({ timeout: 5_000 });
  
  // Then click logout in the dropdown
  await page.getByRole("menuitem", { name: "Log Out" }).or(page.getByText("Log Out")).click({ timeout: 5_000 });

  // Should land on home or login
  await page.waitForURL(/\/(login)?$/, { timeout: 10_000 });

  // Now /dashboard should redirect back to login
  await page.goto("/dashboard");
  await page.waitForURL(/\/login/, { timeout: 10_000 });
  expect(page.url()).toContain("/login");
});
