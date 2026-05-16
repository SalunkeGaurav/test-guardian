import { test, expect } from '@playwright/test';

test.describe('Broken - Renamed ID', () => {
  test('should login with valid credentials', async ({ page }) => {
    await page.goto('https://example.com/login');
    await page.locator('#username').fill('admin');
    await page.locator('#password').fill('secret');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page.locator('.dashboard')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('https://example.com/login');
    await page.locator('input[name="username"]').fill('wrong');
    await page.locator('input[name="password"]').fill('wrong');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('.error-message')).toBeVisible();
  });
});