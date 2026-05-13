import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { detectPlaywright } from '../../src/core/analyzer/detector.js';
import { scanTestFiles, toRelativePath } from '../../src/core/analyzer/scanner.js';

function createTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'tg-test-'));
  // Create node_modules to avoid noise
  mkdirSync(join(dir, 'node_modules'), { recursive: true });
  return dir;
}

describe('Framework Detector', () => {
  it('detects Playwright from config file', () => {
    const dir = createTempDir();
    writeFileSync(join(dir, 'playwright.config.ts'), 'export default {};');
    writeFileSync(join(dir, 'package.json'), JSON.stringify({}));

    const result = detectPlaywright(dir);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('playwright');
    expect(result!.detectionSource).toBe('config');
  });

  it('detects Playwright from package.json dependency', () => {
    const dir = createTempDir();
    writeFileSync(join(dir, 'package.json'), JSON.stringify({
      devDependencies: { '@playwright/test': '^1.45.0' },
    }));

    const result = detectPlaywright(dir);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('playwright');
    expect(result!.version).toBe('1.45.0');
    expect(result!.detectionSource).toBe('dependency');
  });

  it('returns null when no Playwright found', () => {
    const dir = createTempDir();
    writeFileSync(join(dir, 'package.json'), JSON.stringify({
      devDependencies: { vitest: '^1.0.0' },
    }));

    const result = detectPlaywright(dir);
    expect(result).toBeNull();
  });

  it('returns null on empty directory', () => {
    const dir = createTempDir();
    const result = detectPlaywright(dir);
    expect(result).toBeNull();
  });
});

describe('Test File Scanner', () => {
  it('scans .spec.ts files in subdirectories', async () => {
    const dir = createTempDir();
    mkdirSync(join(dir, 'tests'), { recursive: true });
    mkdirSync(join(dir, 'utils'), { recursive: true });
    writeFileSync(join(dir, 'tests', 'login.spec.ts'), '');
    writeFileSync(join(dir, 'tests', 'home.spec.ts'), '');
    writeFileSync(join(dir, 'utils', 'helper.ts'), ''); // should be excluded

    const result = await scanTestFiles({ projectRoot: dir });
    const fileNames = result.files.map((f) => toRelativePath(f, dir));

    expect(fileNames).toContain('tests/login.spec.ts');
    expect(fileNames).toContain('tests/home.spec.ts');
    expect(fileNames).not.toContain('utils/helper.ts');
  });

  it('scans .test.ts files', async () => {
    const dir = createTempDir();
    writeFileSync(join(dir, 'api.test.ts'), '');

    const result = await scanTestFiles({ projectRoot: dir });
    const fileNames = result.files.map((f) => toRelativePath(f, dir));

    expect(fileNames).toContain('api.test.ts');
  });

  it('excludes node_modules by default', async () => {
    const dir = createTempDir();
    mkdirSync(join(dir, 'node_modules', 'some-package', 'tests'), { recursive: true });
    writeFileSync(join(dir, 'node_modules', 'some-package', 'tests', 'test.spec.ts'), '');

    const result = await scanTestFiles({ projectRoot: dir });
    expect(result.files).toHaveLength(0);
  });

  it('returns empty array for empty project', async () => {
    const dir = createTempDir();
    const result = await scanTestFiles({ projectRoot: dir });
    expect(result.files).toEqual([]);
  });

  it('returns sorted results for determinism', async () => {
    const dir = createTempDir();
    writeFileSync(join(dir, 'b.spec.ts'), '');
    writeFileSync(join(dir, 'a.spec.ts'), '');

    const result = await scanTestFiles({ projectRoot: dir });
    const fileNames = result.files.map((f) => toRelativePath(f, dir));

    expect(fileNames).toEqual(['a.spec.ts', 'b.spec.ts']);
  });
});
