import { test, expect } from '@playwright/test';

test.describe('Mixed Framework Conventions', () => {
  test('playwright native selectors', async ({ page }) => {
    await page.goto('https://example.com');
    await page.getByRole('button', { name: 'Submit' }).click();
    await page.getByText('Welcome').waitFor();
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByPlaceholder('Password').fill('secret');
    await page.getByTestId('submit-btn').click();
  });

  test('legacy CSS patterns', async ({ page }) => {
    await page.goto('https://example.com');
    await page.locator('#main-content').click();
    await page.locator('.btn-primary').click();
    await page.locator('div[data-value="test"]').fill('value');
  });

  test('xpath patterns', async ({ page }) => {
    await page.goto('https://example.com');
    await page.locator('//button[@class="submit"]').click();
    await page.locator('//div[contains(@class, "container")]').hover();
  });
});