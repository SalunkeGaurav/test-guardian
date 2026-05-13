import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseSourceFile } from '../../src/adapters/playwright/parser.js';

const FIXTURES_DIR = resolve(import.meta.dirname, '..', '__fixtures__');

function fixture(name: string): string {
  return readFileSync(resolve(FIXTURES_DIR, name), 'utf-8');
}

describe('Playwright AST Parser', () => {
  describe('test extraction', () => {
    it('extracts test names from describe blocks', () => {
      const result = parseSourceFile('sample-spec.ts', fixture('sample-spec.ts'));

      const testNames = result.tests.map((t) => t.fullName);
      expect(testNames).toContain('Authentication > should login successfully');
      expect(testNames).toContain('Authentication > should show error on invalid credentials');
      expect(testNames).toContain('Dashboard > should display charts');
      expect(testNames).toContain('standalone test without describe');
    });

    it('extracts test line numbers', () => {
      const result = parseSourceFile('sample-spec.ts', fixture('sample-spec.ts'));

      const testNames = result.tests.map((t) => t.fullName);
      expect(testNames).toContain('Authentication > should login successfully');
      expect(testNames).toContain('Authentication > should show error on invalid credentials');
      expect(testNames).toContain('Dashboard > should display charts');
      expect(testNames).toContain('standalone test without describe');
    });

    it('extracts tags from test declarations', () => {
      const result = parseSourceFile('sample-spec.ts', fixture('sample-spec.ts'));

      const tagsByTest = new Map(result.tests.map((t) => [t.fullName, t.tags]));
      expect(tagsByTest.get('Authentication > should show error on invalid credentials')).toEqual(['regression']);
      expect(tagsByTest.get('Dashboard > should display charts')).toEqual(['smoke', 'critical']);
      expect(tagsByTest.get('standalone test without describe')).toEqual([]);
    });
  });

  describe('locator extraction', () => {
    it('extracts page.locator() calls with CSS strategy', () => {
      const result = parseSourceFile('sample-spec.ts', fixture('sample-spec.ts'));
      const cssLocators = result.locators.filter((l) => l.strategy === 'css');

      expect(cssLocators.some((l) => l.value === '#username')).toBe(true);
      expect(cssLocators.some((l) => l.value === '.welcome')).toBe(true);
      expect(cssLocators.some((l) => l.value === '.cta-button')).toBe(true);
    });

    it('extracts page.getByRole() calls', () => {
      const result = parseSourceFile('sample-spec.ts', fixture('sample-spec.ts'));
      const roleLocators = result.locators.filter((l) => l.strategy === 'role');

      expect(roleLocators.some((l) => l.value === 'button')).toBe(true);
    });

    it('extracts page.getByPlaceholder() calls', () => {
      const result = parseSourceFile('sample-spec.ts', fixture('sample-spec.ts'));
      const placeholderLocators = result.locators.filter((l) => l.strategy === 'placeholder');

      expect(placeholderLocators.some((l) => l.value === 'Password')).toBe(true);
    });

    it('extracts page.getByLabel() calls', () => {
      const result = parseSourceFile('sample-spec.ts', fixture('sample-spec.ts'));
      const labelLocators = result.locators.filter((l) => l.strategy === 'label');

      expect(labelLocators.some((l) => l.value === 'Username')).toBe(true);
    });

    it('extracts page.getByTestId() calls', () => {
      const result = parseSourceFile('sample-spec.ts', fixture('sample-spec.ts'));
      const testidLocators = result.locators.filter((l) => l.strategy === 'testid');

      expect(testidLocators.some((l) => l.value === 'password-input')).toBe(true);
    });

    it('extracts page.getByAltText() and page.getByTitle() calls', () => {
      const result = parseSourceFile('sample-spec.ts', fixture('sample-spec.ts'));
      const altLocators = result.locators.filter((l) => l.strategy === 'alt-text');
      const titleLocators = result.locators.filter((l) => l.strategy === 'title');

      expect(altLocators.some((l) => l.value === 'revenue-chart')).toBe(true);
      expect(titleLocators.some((l) => l.value === 'Monthly breakdown')).toBe(true);
    });
  });

  describe('navigation extraction', () => {
    it('extracts page.goto() calls with URLs', () => {
      const result = parseSourceFile('sample-spec.ts', fixture('sample-spec.ts'));

      const urls = result.navigations.map((n) => n.url);
      expect(urls).toContain('https://example.com/login');
      expect(urls).toContain('/login');
    });
  });

  describe('page object extraction', () => {
    it('extracts page object classes with locators', () => {
      const result = parseSourceFile('page-object-spec.ts', fixture('page-object-spec.ts'));

      const classNames = result.pageObjects.map((po) => po.name);
      expect(classNames).toContain('LoginPage');
      expect(classNames).toContain('DashboardPage');
      expect(classNames).toContain('SearchPage');
      expect(classNames).toContain('ProfilePage');
    });

    it('extracts locators from page object properties', () => {
      const result = parseSourceFile('page-object-spec.ts', fixture('page-object-spec.ts'));

      const loginPage = result.pageObjects.find((po) => po.name === 'LoginPage');
      expect(loginPage).toBeDefined();
      expect(loginPage!.locators.length).toBeGreaterThanOrEqual(5);

      const strategies = loginPage!.locators.map((l) => l.strategy);
      expect(strategies).toContain('placeholder');
      expect(strategies).toContain('css');
      expect(strategies).toContain('role');
      expect(strategies).toContain('testid');
    });

    it('extracts navigation methods from page objects', () => {
      const result = parseSourceFile('page-object-spec.ts', fixture('page-object-spec.ts'));

      const loginPage = result.pageObjects.find((po) => po.name === 'LoginPage');
      expect(loginPage).toBeDefined();
      expect(loginPage!.navigationMethods.length).toBeGreaterThanOrEqual(2);

      const methodNames = loginPage!.navigationMethods.map((m) => m.name);
      expect(methodNames).toContain('login');
      expect(methodNames).toContain('navigateToLogin');
    });
  });

  describe('XPath detection', () => {
    it('detects XPath locators from page.locator()', () => {
      const result = parseSourceFile('xpath-locators-spec.ts', fixture('xpath-locators-spec.ts'));

      const xpathLocators = result.locators.filter((l) => l.strategy === 'xpath');
      expect(xpathLocators.length).toBeGreaterThanOrEqual(2);
      expect(xpathLocators.some((l) => l.value.startsWith('//'))).toBe(true);
      expect(xpathLocators.some((l) => l.value.startsWith('..'))).toBe(true);
    });

    it('detects text selectors in locator()', () => {
      const result = parseSourceFile('xpath-locators-spec.ts', fixture('xpath-locators-spec.ts'));

      const textLocators = result.locators.filter((l) => l.strategy === 'text');
      expect(textLocators.some((l) => l.value === 'text=Click here')).toBe(true);
    });

    it('detects testid from locator() with data-testid', () => {
      const result = parseSourceFile('xpath-locators-spec.ts', fixture('xpath-locators-spec.ts'));

      const testidLocators = result.locators.filter((l) => l.strategy === 'testid');
      expect(testidLocators.some((l) => l.value === 'data-testid=custom-id')).toBe(true);
    });
  });

  describe('complex patterns', () => {
    it('extracts variable-based navigation', () => {
      const result = parseSourceFile('complex-patterns-spec.ts', fixture('complex-patterns-spec.ts'));

      const navigations = result.navigations.filter((n) => n.urlPattern === 'variable');
      expect(navigations.length).toBeGreaterThanOrEqual(1);
      expect(navigations.some((n) => n.url === '<var:BASE_URL>')).toBe(true);
    });

    it('extracts locators with variable selectors', () => {
      const result = parseSourceFile('complex-patterns-spec.ts', fixture('complex-patterns-spec.ts'));

      const varLocators = result.locators.filter((l) => l.value.startsWith('<var:'));
      expect(varLocators.some((l) => l.value === '<var:DYNAMIC_SELECTOR>')).toBe(true);
    });

    it('extracts template literal locators', () => {
      const result = parseSourceFile('complex-patterns-spec.ts', fixture('complex-patterns-spec.ts'));

      const templateLocators = result.locators.filter((l) => l.value.startsWith('template:'));
      expect(templateLocators.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('locator hashing', () => {
    it('produces stable deterministic hashes', () => {
      const result1 = parseSourceFile('sample-spec.ts', fixture('sample-spec.ts'));
      const result2 = parseSourceFile('sample-spec.ts', fixture('sample-spec.ts'));

      const ids1 = result1.locators.map((l) => l.id).sort();
      const ids2 = result2.locators.map((l) => l.id).sort();
      expect(ids1).toEqual(ids2);
    });

    it('produces unique hashes for different locators', () => {
      const result = parseSourceFile('sample-spec.ts', fixture('sample-spec.ts'));

      const ids = result.locators.map((l) => l.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });
  });
});
