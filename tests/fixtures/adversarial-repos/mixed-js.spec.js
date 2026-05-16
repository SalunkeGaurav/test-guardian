const { test, expect } = require('@playwright/test');

test.describe('Mixed JS/TS Conventions', () => {
  test('javascript test file', async ({ page }) => {
    await page.goto('https://example.com');
    await page.click('#submit');
    await page.fill('input[name="username]', 'admin');
    await expect(page.locator('.success')).toBeVisible();
  });

  test('javascript with callbacks', async ({ page }) => {
    await page.goto('https://example.com');
    await page.evaluate(() => {
      console.log('Evaluating script');
    });
  });
});