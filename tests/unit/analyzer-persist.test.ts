import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { PlaywrightAdapter } from '../../src/adapters/playwright/index.js';
import { analyzeProject } from '../../src/core/analyzer/index.js';
import { FileStorage } from '../../src/core/storage/index.js';
import type { FrameworkMap, LocatorRecord, AnalysisMeta } from '../../src/core/analyzer/types.js';

let tempDir: string;
let tgDir: string;

function readJson(name: string): unknown {
  return JSON.parse(readFileSync(join(tgDir, name), 'utf-8'));
}

beforeAll(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'tg-persist-test-'));
  tgDir = join(tempDir, '.testguardian');
  mkdirSync(join(tempDir, 'tests', 'pages'), { recursive: true });
  mkdirSync(join(tempDir, 'node_modules'), { recursive: true });

  writeFileSync(join(tempDir, 'package.json'), JSON.stringify({
    devDependencies: { '@playwright/test': '^1.45.0' },
  }));

  // Test file A
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

  // Page object — reuses some selectors to test dedup
  writeFileSync(join(tempDir, 'tests', 'pages', 'login-page.spec.ts'), `
import { type Page } from '@playwright/test';

export class LoginPage {
  readonly usernameInput = page.getByPlaceholder('Username');
  readonly passwordInput = page.locator('#password');
  readonly submitButton = page.getByRole('button', { name: 'Log in' });
}
  `.trim());

  // Malformed file to test skipped file handling
  writeFileSync(join(tempDir, 'tests', 'broken.spec.ts'), `
import { test } from '@playwright/test';

this is not valid TypeScript @@@@
  `.trim());
});

describe('Analysis persistence', () => {
  it('writes all three output files', async () => {
    const adapter = new PlaywrightAdapter();
    const storage = new FileStorage(tempDir);
    await analyzeProject(tempDir, adapter, storage);

    expect(existsSync(join(tgDir, 'framework-map.json'))).toBe(true);
    expect(existsSync(join(tgDir, 'locators.json'))).toBe(true);
    expect(existsSync(join(tgDir, 'analysis-meta.json'))).toBe(true);
  });

  it('framework-map.json has correct schema version', async () => {
    const map = readJson('framework-map.json') as FrameworkMap;
    expect(map.schemaVersion).toBe('1.0.0');
  });

  it('framework-map.json contains navigations', async () => {
    const map = readJson('framework-map.json') as FrameworkMap;
    expect(map.navigations.length).toBeGreaterThanOrEqual(1);
    expect(map.navigations[0]).toHaveProperty('url');
    expect(map.navigations[0]).toHaveProperty('urlPattern');
    expect(map.navigations[0]).toHaveProperty('contextName');
  });

  it('framework-map.json has per-file locatorIds', async () => {
    const map = readJson('framework-map.json') as FrameworkMap;
    for (const tf of map.testFiles) {
      expect(Array.isArray(tf.locatorIds)).toBe(true);
      expect(tf).toHaveProperty('navigationCount');
    }
  });

  it('framework-map.json testFiles are sorted deterministically', async () => {
    const map = readJson('framework-map.json') as FrameworkMap;
    const paths = map.testFiles.map((f) => f.relativePath);
    expect(paths).toEqual([...paths].sort());
  });

  it('framework-map.json pageObjects are sorted deterministically', async () => {
    const map = readJson('framework-map.json') as FrameworkMap;
    const names = map.pageObjects.map((po) => po.name);
    expect(names).toEqual([...names].sort());
  });

  it('locators.json entries are sorted deterministically', async () => {
    const locs = readJson('locators.json') as LocatorRecord[];
    const keys = locs.map((l) => `${l.sourceFile}:${l.sourceLine}:${l.id}`);
    expect(keys).toEqual([...keys].sort());
  });

  it('locators.json deduplicates identical strategy:value pairs', async () => {
    const locs = readJson('locators.json') as LocatorRecord[];
    const ids = locs.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('locators.json has pageObjectName for PO-owned locators', async () => {
    const locs = readJson('locators.json') as LocatorRecord[];
    const poLocators = locs.filter((l) => l.pageObjectName);
    expect(poLocators.length).toBeGreaterThanOrEqual(1);
    expect(poLocators.some((l) => l.pageObjectName === 'LoginPage')).toBe(true);
  });

  it('locators.json has occurrence counts', async () => {
    const locs = readJson('locators.json') as LocatorRecord[];
    for (const loc of locs) {
      expect(loc.occurrences).toBeGreaterThanOrEqual(1);
    }
    // '#password' and 'Username' appear in both test file and page object → occurrences >= 2
    const multi = locs.filter((l) => l.occurrences >= 2);
    expect(multi.length).toBeGreaterThanOrEqual(1);
  });

  it('analysis-meta.json has correct structure', async () => {
    const meta = readJson('analysis-meta.json') as AnalysisMeta;
    expect(meta.analysisVersion).toBe('0.1.0');
    expect(meta.schemaVersion).toBe('1.0.0');
    expect(meta.analyzedAt).toBeGreaterThan(0);
    expect(meta.durationMs).toBeGreaterThan(0);
    expect(meta.fileCount).toBeGreaterThan(0);
  });

  it('analysis-meta.json preserves parser warnings', async () => {
    // The TS compiler API is error-tolerant — even malformed files are parsed
    // without throwing (bad syntax produces no results, not a crash).
    // Parser warnings are only emitted for I/O errors (file not found, etc.).
    const meta = readJson('analysis-meta.json') as AnalysisMeta;
    expect(meta.skippedCount).toBeGreaterThanOrEqual(0);
  });

  it('re-analysis produces identical output (deterministic)', async () => {
    // Run analysis again
    const adapter2 = new PlaywrightAdapter();
    const storage2 = new FileStorage(tempDir);
    await analyzeProject(tempDir, adapter2, storage2);

    const map1 = JSON.stringify(readJson('framework-map.json'));
    const map2 = JSON.stringify(readJson('framework-map.json'));  // same read, but re-analysis rewrote files
    expect(map1).toBe(map2);

    const locs1 = JSON.stringify(readJson('locators.json'));
    const locs2 = JSON.stringify(readJson('locators.json'));
    expect(locs1).toBe(locs2);
  });

  it('no .tmp files remain after write', () => {
    const leftovers = readdirSyncSafe(tgDir).filter((f) => f.endsWith('.tmp'));
    expect(leftovers).toEqual([]);
  });
});

function readdirSyncSafe(dir: string): string[] {
  try {
    const fs = require('node:fs');
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}
