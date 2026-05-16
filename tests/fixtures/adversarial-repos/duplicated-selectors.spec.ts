import { test, expect } from '@playwright/test';

test.describe('Duplicate Selector Patterns', () => {
  test('identical selectors across multiple files', async ({ page }) => {
    await page.goto('https://example.com/form');
    await page.locator('#submit').click();
    await page.locator('#submit').first().click();
    await page.locator('.btn').click();
    await page.locator('.btn').first().click();
    await page.locator('button').click();
    await page.locator('button').first().click();
  });

  test('similar selectors with variations', async ({ page }) => {
    await page.goto('https://example.com');
    await page.locator('input[type="text"]').fill('a');
    await page.locator('input[type="text"]').first().fill('b');
    await page.locator('input.text').fill('c');
    await page.locator('input[class="text"]').fill('d');
  });

  test('sibling selectors', async ({ page }) => {
    await page.goto('https://example.com');
    await page.locator('div + div').click();
    await page.locator('li ~ li').click();
    await page.locator('.item ~ .item').click();
  });
});