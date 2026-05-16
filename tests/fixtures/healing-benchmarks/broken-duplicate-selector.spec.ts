import { test, expect } from '@playwright/test';

test.describe('Broken - Duplicate Selectors', () => {
  test('should find first button', async ({ page }) => {
    await page.goto('https://example.com');
    await page.locator('.btn').first().click();
    await expect(page.locator('.result')).toBeVisible();
  });

  test('should find second button', async ({ page }) => {
    await page.goto('https://example.com');
    await page.locator('.btn').nth(1).click();
    await expect(page.locator('.result-2')).toBeVisible();
  });

  test('should use generic button', async ({ page }) => {
    await page.goto('https://example.com');
    await page.locator('button').click();
    await expect(page.locator('.modal')).toBeVisible();
  });
});