/**
 * Sample Playwright test file for parser unit tests.
 * Covers: test, describe, locators, page objects, navigation, tags.
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/login-page';

test.describe('Authentication', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('https://example.com/login');
    await page.locator('#username').fill('admin');
    await page.getByPlaceholder('Password').fill('secret123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.locator('.welcome')).toBeVisible();
  });

  test('should show error on invalid credentials', { tags: ['regression'] }, async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Username').fill('baduser');
    await page.getByTestId('password-input').fill('wrongpass');
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText('Invalid credentials')).toBeVisible();
  });
});

test.describe('Dashboard', () => {
  test('should display charts', { tags: ['smoke', 'critical'] }, async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByAltText('revenue-chart')).toBeVisible();
    await expect(page.getByTitle('Monthly breakdown')).toBeVisible();
  });
});

test('standalone test without describe', async ({ page }) => {
  await page.goto('/home');
  await page.locator('.cta-button').click();
});
