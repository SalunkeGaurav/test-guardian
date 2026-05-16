import { test, expect } from '@playwright/test';

test.describe('Broken - Dynamic Selector', () => {
  test('should click item by generated ID', async ({ page }) => {
    await page.goto('https://example.com');
    const dynamicId = 'item-' + Date.now();
    await page.locator(`[data-testid="${dynamicId}"]`).click();
    await expect(page.locator('.success')).toBeVisible();
  });

  test('should find element by index', async ({ page }) => {
    await page.goto('https://example.com');
    await page.locator('.item').nth(3).click();
    await expect(page.locator('.item-3')).toBeVisible();
  });

  test('should use template selector', async ({ page }) => {
    await page.goto('https://example.com');
    const type = 'button';
    const id = 'submit';
    await page.locator(`${type}#${id}`).click();
  });
});