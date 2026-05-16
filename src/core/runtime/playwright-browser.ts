/**
 * PlaywrightBrowserEngine
 *
 * BrowserEngine implementation using the Playwright library.
 * Provides real browser automation for runtime replay validation.
 *
 * This file imports from 'playwright' which must be installed in the project.
 * Uses deterministic, sequential operations. No concurrency.
 */

import type { Result } from '../../models/result.js';
import type { DomSnapshot, ElementNode } from '../../models/snapshot.js';
import type { BrowserEngine } from './browser.js';
import type { BrowserContextState, NavigationResult, InteractionResult, MatchedElement, BrowserConfig } from '../../models/runtime.js';
import { success, failure } from '../../models/result.js';
import { DEFAULT_BROWSER_TIMEOUT, DEFAULT_VIEWPORT_WIDTH, DEFAULT_VIEWPORT_HEIGHT } from './schema.js';

export class PlaywrightBrowserEngine implements BrowserEngine {
  private browser: any = null;
  private contexts: Map<string, any> = new Map();

  async launch(config?: BrowserConfig): Promise<Result<void>> {
    try {
      const playwright = await import('playwright');
      const { chromium } = playwright;
      this.browser = await chromium.launch({
        headless: config?.headless ?? true,
        args: config?.args ?? [],
      });
      return success(undefined);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  async close(): Promise<Result<void>> {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      this.contexts.clear();
      return success(undefined);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  async createContext(): Promise<Result<BrowserContextState>> {
    try {
      if (!this.browser) return failure('Browser not launched');

      const pwContext = await this.browser.newContext({
        viewport: { width: DEFAULT_VIEWPORT_WIDTH, height: DEFAULT_VIEWPORT_HEIGHT },
      });
      const page = await pwContext.newPage();

      const state: BrowserContextState = {
        id: `ctx-${Date.now()}`,
        currentUrl: '',
        currentFrame: 'main',
      };

      this.contexts.set(state.id, { pwContext, page });
      return success(state);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  async closeContext(context: BrowserContextState): Promise<Result<void>> {
    try {
      const ctx = this.contexts.get(context.id);
      if (ctx) {
        await ctx.pwContext.close();
        this.contexts.delete(context.id);
      }
      return success(undefined);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  async goto(context: BrowserContextState, url: string): Promise<Result<NavigationResult>> {
    try {
      const ctx = this.contexts.get(context.id);
      if (!ctx) return failure('Context not found');

      const startTime = performance.now();
      const response = await ctx.page.goto(url, { timeout: DEFAULT_BROWSER_TIMEOUT, waitUntil: 'networkidle' });
      const timing = Math.round(performance.now() - startTime);
      context.currentUrl = url;

      return success({
        url: response?.url() ?? url,
        title: await ctx.page.title().catch(() => ''),
        timing,
      });
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  async click(context: BrowserContextState, _strategy: string, value: string): Promise<Result<InteractionResult>> {
    try {
      const ctx = this.contexts.get(context.id);
      if (!ctx) return failure('Context not found');

      const startTime = performance.now();
      const locator = this.buildLocator(ctx.page, _strategy, value);
      await locator.waitFor({ state: 'visible', timeout: DEFAULT_BROWSER_TIMEOUT });
      await locator.click({ timeout: DEFAULT_BROWSER_TIMEOUT });
      const timing = Math.round(performance.now() - startTime);

      const box = await locator.boundingBox().catch(() => null);
      const visible = await locator.isVisible().catch(() => false);

      return success({
        success: true,
        matchedElement: {
          tagName: await locator.evaluate((el: Element) => el.tagName.toLowerCase()).catch(() => 'unknown'),
          attributes: await locator.evaluate((el: Element) => {
            const attrs: Record<string, string> = {};
            for (let i = 0; i < el.attributes.length; i++) {
              const attr = el.attributes[i]!;
              attrs[attr.name] = attr.value;
            }
            return attrs;
          }).catch(() => ({})),
          textContent: await locator.textContent().catch(() => undefined) ?? undefined,
          visible,
          interactable: visible,
          boundingBox: box ?? undefined,
        },
        timing,
      });
    } catch (err) {
      return success({
        success: false,
        timing: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async fill(context: BrowserContextState, _strategy: string, value: string, text: string): Promise<Result<InteractionResult>> {
    try {
      const ctx = this.contexts.get(context.id);
      if (!ctx) return failure('Context not found');

      const startTime = performance.now();
      const locator = this.buildLocator(ctx.page, _strategy, value);
      await locator.waitFor({ state: 'visible', timeout: DEFAULT_BROWSER_TIMEOUT });
      await locator.fill(text, { timeout: DEFAULT_BROWSER_TIMEOUT });
      const timing = Math.round(performance.now() - startTime);

      return success({
        success: true,
        timing,
      });
    } catch (err) {
      return success({
        success: false,
        timing: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async press(context: BrowserContextState, _strategy: string, value: string, key: string): Promise<Result<InteractionResult>> {
    try {
      const ctx = this.contexts.get(context.id);
      if (!ctx) return failure('Context not found');

      const startTime = performance.now();
      const locator = this.buildLocator(ctx.page, _strategy, value);
      await locator.waitFor({ state: 'visible', timeout: DEFAULT_BROWSER_TIMEOUT });
      await locator.press(key, { timeout: DEFAULT_BROWSER_TIMEOUT });
      const timing = Math.round(performance.now() - startTime);

      return success({ success: true, timing });
    } catch (err) {
      return success({
        success: false,
        timing: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async select(context: BrowserContextState, _strategy: string, value: string, option: string): Promise<Result<InteractionResult>> {
    try {
      const ctx = this.contexts.get(context.id);
      if (!ctx) return failure('Context not found');

      const startTime = performance.now();
      const locator = this.buildLocator(ctx.page, _strategy, value);
      await locator.waitFor({ state: 'visible', timeout: DEFAULT_BROWSER_TIMEOUT });
      await locator.selectOption(option, { timeout: DEFAULT_BROWSER_TIMEOUT });
      const timing = Math.round(performance.now() - startTime);

      return success({ success: true, timing });
    } catch (err) {
      return success({
        success: false,
        timing: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async wait(context: BrowserContextState, timeout: number): Promise<Result<void>> {
    try {
      const ctx = this.contexts.get(context.id);
      if (!ctx) return failure('Context not found');
      await ctx.page.waitForTimeout(timeout);
      return success(undefined);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  async captureSnapshot(context: BrowserContextState): Promise<Result<DomSnapshot>> {
    try {
      const ctx = this.contexts.get(context.id);
      if (!ctx) return failure('Context not found');

      const snapshotId = `runtime-snapshot-${Date.now()}`;
      const html = await ctx.page.content().catch(() => '');

      const snapshot: DomSnapshot = {
        id: snapshotId,
        traceId: 'runtime',
        eventIndex: 0,
        capturedAt: Date.now(),
        url: context.currentUrl,
        htmlPath: undefined,
        viewport: { width: DEFAULT_VIEWPORT_WIDTH, height: DEFAULT_VIEWPORT_HEIGHT },
      };

      return success(snapshot);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  async getCurrentUrl(context: BrowserContextState): Promise<string> {
    const ctx = this.contexts.get(context.id);
    if (!ctx) return '';
    try {
      return ctx.page.url();
    } catch {
      return context.currentUrl;
    }
  }

  async getConsoleErrors(context: BrowserContextState): Promise<string[]> {
    const ctx = this.contexts.get(context.id);
    if (!ctx) return [];
    try {
      // Console errors are captured via page.on('console') in a real setup
      return [];
    } catch {
      return [];
    }
  }

  async resolveElement(context: BrowserContextState, _strategy: string, value: string): Promise<Result<MatchedElement[]>> {
    try {
      const ctx = this.contexts.get(context.id);
      if (!ctx) return failure('Context not found');

      const locator = this.buildLocator(ctx.page, _strategy, value);
      const count = await locator.count();

      if (count === 0) return success([]);

      const elements: MatchedElement[] = [];
      for (let i = 0; i < count; i++) {
        const el = locator.nth(i);
        const visible = await el.isVisible().catch(() => false);
        const enabled = await el.isEnabled().catch(() => false);
        const box = await el.boundingBox().catch(() => null);
        const tagName = await el.evaluate((e: Element) => e.tagName.toLowerCase()).catch(() => 'unknown');

        elements.push({
          tagName,
          attributes: {},
          visible,
          interactable: visible && enabled,
          boundingBox: box ?? undefined,
        });
      }

      return success(elements);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  private buildLocator(page: any, strategy: string, value: string): any {
    switch (strategy) {
      case 'id':
        return page.locator(`#${CSS.escape(value)}`);
      case 'testid':
        return page.locator(`[data-testid="${value}"]`);
      case 'aria-label':
        return page.locator(`[aria-label="${value}"]`);
      case 'role':
        return page.getByRole(value as any);
      case 'name':
        return page.locator(`[name="${value}"]`);
      case 'placeholder':
        return page.locator(`[placeholder="${value}"]`);
      case 'text':
        return page.getByText(value);
      case 'tag':
        return page.locator(value);
      case 'class-name':
        return page.locator(`.${CSS.escape(value)}`);
      case 'css':
      default:
        return page.locator(value);
    }
  }
}
