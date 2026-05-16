import { test } from '@playwright/test';

test('this file has broken syntax @@@ invalid characters', async ({ page }) => {
  await page.goto('https://example.com');
  await page.locator('#button').click();
});

this is not valid typescript code @@@

function broken() {
  return {
    invalid: syntax,
}