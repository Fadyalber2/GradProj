import { test, expect } from "@playwright/test";

// Runs without storageState — tests the login itself
test("admin login with valid credentials redirects to admin dashboard", async ({ page }) => {
  await page.goto("/admin/login");

  await expect(page.getByText("Admin Panel")).toBeVisible();

  await page.getByPlaceholder("Admin").fill(process.env.TEST_ADMIN_USERNAME!);
  await page.getByPlaceholder("••••••••").fill(process.env.TEST_ADMIN_PASSWORD!);
  
  // Use Promise.all to handle navigation and button click race condition
  await Promise.all([
    page.waitForURL("/admin/dashboard", { timeout: 15_000 }),
    page.getByRole("button", { name: "Sign In" }).click()
  ]);
  
  await expect(page.getByText(/admin|dashboard/i).first()).toBeVisible();
});

test("admin login with wrong password shows error", async ({ page }) => {
  await page.goto("/admin/login");

  await page.getByPlaceholder("Admin").fill("admin");
  await page.getByPlaceholder("••••••••").fill("wrongpassword");
  
  // Click the button and wait for error message
  await page.getByRole("button", { name: "Sign In" }).click();
  
  await expect(page.getByText(/failed|invalid|incorrect/i)).toBeVisible({ timeout: 8_000 });
  expect(page.url()).not.toContain("/admin/dashboard");
});
