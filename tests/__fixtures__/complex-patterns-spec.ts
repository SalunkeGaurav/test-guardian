/**
 * Test file with complex patterns: template literals, variables, dynamic selectors.
 */

import { test } from '@playwright/test';

const BASE_URL = 'https://example.com';
const DYNAMIC_SELECTOR = '.dynamic-element';

test('should use variable navigation', async ({ page }) => {
  await page.goto(BASE_URL);
  await page.locator(DYNAMIC_SELECTOR).click();
});

test('should use template literal locator', async ({ page }) => {
  const itemId = '123';
  await page.goto('/items');
  await page.locator(`item-${itemId}`).click();
});

test('should use chained locators', async ({ page }) => {
  await page.goto('/chained');
  await page.locator('.container').locator('.inner-button').click();
});

test('should handle multiple arguments in getByRole', async ({ page }) => {
  await page.goto('/role-test');
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await page.getByRole('link', { name: 'Cancel' }).click();
});
