import { test, expect } from "@playwright/test";

test("reset chat button clears conversation history", async ({ page }) => {
  await page.goto("/");

  // Open chat
  const aiButton = page.getByRole("button", { name: /chat|ai|assistant/i })
    .or(page.locator("button[aria-label*='chat' i], button[aria-label*='ai' i]"))
    .first();
  await aiButton.click();

  const drawer = page.locator("[role='dialog'], [data-state='open']").first();
  await expect(drawer).toBeVisible({ timeout: 5_000 });

  // Send a message first
  const input = drawer.getByRole("textbox")
    .or(drawer.locator("input[type='text'], textarea"))
    .first();
  await input.fill("Hello");
  await drawer.getByRole("button", { name: /send/i }).click();

  // Wait for response
  await expect(
    drawer.locator("[class*='message'], [class*='bubble']").last()
  ).toBeVisible({ timeout: 30_000 });

  // Click reset/clear button (RotateCcw icon button)
  const resetBtn = drawer.getByRole("button", { name: /reset|clear|new chat/i })
    .or(drawer.locator("button[aria-label*='reset' i], button[aria-label*='clear' i]"))
    .first();
  await expect(resetBtn).toBeVisible();
  await resetBtn.click();

  // Chat history cleared — no message bubbles (or only welcome message)
  const messages = drawer.locator("[class*='message'], [class*='bubble']");
  const count = await messages.count();
  expect(count).toBeLessThanOrEqual(1); // 0 or just welcome
});
