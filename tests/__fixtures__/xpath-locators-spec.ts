/**
 * Test file with XPath and mixed locator patterns.
 */

import { test, expect } from '@playwright/test';

test('should handle xpath locators', async ({ page }) => {
  await page.goto('/advanced');
  await page.locator('//div[@id="main"]//button').click();
  await page.locator('..//span[@class="error"]').textContent();
  await page.locator('text=Click here').click();
});

test('should handle has-text selector', async ({ page }) => {
  await page.goto('/selectors');
  await page.locator('text=Submit form').click();
  await page.locator('data-testid=custom-id').click();
});

test('should handle frame locator', async ({ page }) => {
  const frame = page.frameLocator('iframe[title="main"]');
  await frame.locator('.inside-frame').click();
});
