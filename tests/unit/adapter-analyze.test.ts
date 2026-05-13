import { describe, it, expect, beforeAll } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { PlaywrightAdapter } from '../../src/adapters/playwright/index.js';

let tempDir: string;

beforeAll(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'tg-adapter-test-'));
  mkdirSync(join(tempDir, 'tests', 'pages'), { recursive: true });
  mkdirSync(join(tempDir, 'node_modules'), { recursive: true });

  // package.json with Playwright dependency
  writeFileSync(join(tempDir, 'package.json'), JSON.stringify({
    devDependencies: { '@playwright/test': '^1.45.0' },
  }));

  // Test file
  writeFileSync(join(tempDir, 'tests', 'login.spec.ts'), `
import { test, expect } from '@playwright/test';

test.describe('Login', () => {
  test('should work', async ({ page }) => {
    await page.goto('https://example.com/login');
    await page.getByPlaceholder('Username').fill('admin');
    await page.locator('#password').fill('secret');
    await page.getByRole('button').click();
    await expect(page.locator('.dashboard')).toBeVisible();
  });
});
  `.trim());

  // Page object file — use .spec.ts suffix so scanner picks it up
  writeFileSync(join(tempDir, 'tests', 'pages', 'login-page.spec.ts'), `
import { type Page } from '@playwright/test';

export class LoginPage {
  readonly usernameInput = page.getByPlaceholder('Username');
  readonly passwordInput = page.locator('#password');
  readonly submitButton = page.getByRole('button', { name: 'Log in' });

  async login(username: string, password: string) {
    await page.goto('/login');
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
  `.trim());
});

describe('PlaywrightAdapter analyze', () => {
  it('detects Playwright project', () => {
    const adapter = new PlaywrightAdapter();
    const result = adapter.detect(tempDir);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
  });

  it('analyzes project and extracts test files', async () => {
    const adapter = new PlaywrightAdapter();
    const result = await adapter.analyze(tempDir);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.testFiles.length).toBeGreaterThanOrEqual(1);
    expect(result.value.stats.totalTests).toBeGreaterThanOrEqual(1);
  });

  it('extracts locators from test files', async () => {
    const adapter = new PlaywrightAdapter();
    const result = await adapter.analyze(tempDir);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.locators.length).toBeGreaterThanOrEqual(4);
    const locatorValues = result.value.locators.map((l) => l.value);
    expect(locatorValues).toContain('#password');
    expect(locatorValues).toContain('.dashboard');
  });

  it('extracts page objects', async () => {
    const adapter = new PlaywrightAdapter();
    const result = await adapter.analyze(tempDir);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const poNames = result.value.pageObjects.map((po) => po.name);
    expect(poNames).toContain('LoginPage');
  });

  it('extracts navigations', async () => {
    const adapter = new PlaywrightAdapter();
    const result = await adapter.analyze(tempDir);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.navigations.length).toBeGreaterThanOrEqual(2);
  });

  it('produces analysis stats', async () => {
    const adapter = new PlaywrightAdapter();
    const result = await adapter.analyze(tempDir);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.stats.totalFiles).toBeGreaterThan(0);
    expect(result.value.stats.totalTests).toBeGreaterThan(0);
    expect(result.value.stats.totalLocators).toBeGreaterThan(0);
    expect(result.value.stats.totalPageObjects).toBeGreaterThan(0);
    expect(result.value.stats.totalNavigations).toBeGreaterThan(0);
    expect(result.value.stats.analyzedAt).toBeGreaterThan(0);
    expect(result.value.stats.durationMs).toBeGreaterThan(0);
  });
});
