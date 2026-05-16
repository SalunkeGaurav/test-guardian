import { test, expect } from '@playwright/test';

test.describe('Chained Locator Stress', () => {
  test('deeply nested chained locators', async ({ page }) => {
    await page.goto('https://example.com/dashboard');
    await page.locator('.container').first().locator('.sidebar').locator('ul').locator('li').nth(0).click();
    await page.locator('div.main').locator('div.content').locator('span.label').first().hover();
    await page.locator('form').locator('fieldset').locator('.input-group').locator('input').fill('test');
  });

  test('multiple chained paths', async ({ page }) => {
    await page.goto('https://example.com');
    const a = page.locator('.a').locator('.b').locator('.c');
    const b = page.locator('.x').locator('.y').locator('.z');
    await a.click();
    await b.fill('value');
  });
});