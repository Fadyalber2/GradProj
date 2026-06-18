import { test as setup, expect } from "@playwright/test";
import path from "path";

const AUTH_FILE = path.resolve("playwright/.auth/admin.json");

setup("authenticate as admin", async ({ page }) => {
  await page.goto("/admin/login", { timeout: 10_000 });

  try {
    await page.getByPlaceholder("Admin").fill(process.env.TEST_ADMIN_USERNAME!, { timeout: 5_000 });
    await page.getByPlaceholder("••••••••").fill(process.env.TEST_ADMIN_PASSWORD!, { timeout: 5_000 });
    
    // Click login with timeout
    await page.getByRole("button", { name: "Sign In" }).click({ timeout: 5_000 });
    
    // Wait for either success or error with shorter timeout
    try {
      await page.waitForURL("/admin/dashboard", { timeout: 10_000 });
    } catch (error) {
      // If dashboard doesn't load, check for error messages
      const errorElement = page.getByText(/invalid|incorrect|failed|error/i).first();
      if (await errorElement.isVisible({ timeout: 2_000 }).catch(() => false)) {
        throw new Error(`Admin login failed: ${await errorElement.textContent()}`);
      }
      throw new Error("Admin login failed - no dashboard redirect or error message");
    }
  } catch (error) {
    console.error("Admin setup failed:", error);
    // Still save auth state (even if failed) to allow other tests to run
    await page.context().storageState({ path: AUTH_FILE });
    throw error;
  }

  await page.context().storageState({ path: AUTH_FILE });
});
