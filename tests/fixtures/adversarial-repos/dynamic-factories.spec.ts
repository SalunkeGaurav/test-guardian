import { test, expect } from '@playwright/test';

function createDynamicLocator(page: any, prefix: string) {
  return page.locator(`[data-${prefix}="${prefix}-value"]`);
}

function getSelectorForRole(role: string) {
  return `button[role="${role}"]`;
}

test.describe('Dynamic Locator Factories', () => {
  test('dynamically generated selectors', async ({ page }) => {
    await page.goto('https://example.com');

    const dynamicId = 'item-' + Math.random().toString(36).substr(2, 9);
    await page.locator(`[data-testid="${dynamicId}"]`).click();

    const idx = 0;
    await page.locator(`.item:nth-child(${idx + 1})`).click();

    const name = 'test';
    await page.locator(`input[name="${name}"]`).fill('value');
  });

  test('factory function locators', async ({ page }) => {
    await page.goto('https://example.com');
    const loc = createDynamicLocator(page, 'item');
    await loc.click();

    const selector = getSelectorForRole('button');
    await page.locator(selector).click();
  });

  test('template literal selectors', async ({ page }) => {
    await page.goto('https://example.com');
    const type = 'button';
    const id = 'submit';
    await page.locator(`${type}#${id}`).click();
  });
});