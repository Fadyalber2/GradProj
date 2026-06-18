import { test, expect } from "@playwright/test";

test("AI chatbot opens, accepts message, and streams response without error", async ({ page }) => {
  await page.goto("/");

  // Click the floating AI button to open chat drawer
  const aiButton = page.getByRole("button", { name: /chat|ai|assistant/i })
    .or(page.locator("button[aria-label*='chat' i], button[aria-label*='ai' i]"))
    .first();
  await expect(aiButton).toBeVisible({ timeout: 10_000 });
  await aiButton.click();

  // Drawer opens
  const drawer = page.locator("[role='dialog'], [data-state='open']").first();
  await expect(drawer).toBeVisible({ timeout: 5_000 });

  // Type a message
  const input = drawer.getByRole("textbox")
    .or(drawer.locator("input[type='text'], textarea"))
    .first();
  await expect(input).toBeVisible();
  await input.fill("What properties are available in Maadi?");

  // Send
  await drawer.getByRole("button", { name: /send/i }).click();

  // Response appears (any assistant message bubble)
  await expect(
    drawer.locator("[class*='message'], [class*='bubble'], [class*='assistant']").last()
  ).toBeVisible({ timeout: 30_000 });

  // No error state visible
  await expect(drawer.getByText(/error|failed|500/i)).not.toBeVisible();
});
