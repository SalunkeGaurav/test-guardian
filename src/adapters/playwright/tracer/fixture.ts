import { test as base, expect, type Page, type Locator } from 'playwright-core';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { TraceRecorder, wrapLocator } from './trace-recorder.js';
import type { ExecutionTrace } from '../../../models/trace.js';

const LOCATOR_CREATORS = [
  'locator', 'getByRole', 'getByText', 'getByPlaceholder',
  'getByLabel', 'getByTestId', 'getByAltText', 'getByTitle',
  'frameLocator',
];

export { expect };

export const test = base.extend<{ traceRecorder: TraceRecorder }>({
  page: async ({ page }, use, testInfo) => {
    if (!page) {
      await use(page as unknown as Page);
      return;
    }

    const recorder = new TraceRecorder(testInfo.file, testInfo.title);

    page.on('load', () => {
      try { recorder.onNavigation(page.url()); } catch { /* page may be closed */ }
    });

    page.on('pageerror', (err) => {
      recorder.onError(err.message);
    });

    const wrappedPage = wrapPageLocatorCreators(page, recorder);

    await use(wrappedPage);

    const passed = testInfo.errors?.length === 0;
    const errorMsg = testInfo.errors?.[0]?.message;

    if (!passed && page && !page.isClosed()) {
      try {
        const snapId = await recorder.captureSnapshot(page, testInfo);
        if (snapId) {
          const snapDir = join(projectRootFrom(testInfo), '.testguardian', 'snapshots');
          const html = await page.content();
          const url = page.url();
          writeFileSync(join(snapDir, `${snapId}.html`), html, 'utf-8');
          writeFileSync(join(snapDir, `${snapId}.meta.json`), JSON.stringify({
            id: snapId, url, capturedAt: Date.now(), eventIndex: recorder.getEvents().length,
          }, null, 2), 'utf-8');
        }
      } catch { /* snapshot best-effort */ }
    }

    const trace = recorder.buildTrace(passed, errorMsg);
    persistTrace(trace, projectRootFrom(testInfo));
  },
  traceRecorder: async ({ page }, use, testInfo) => {
    if (!page) { await use(undefined as unknown as TraceRecorder); return; }
    const recorder = new TraceRecorder(testInfo.file, testInfo.title);
    await use(recorder);
  },
});

function wrapPageLocatorCreators(page: Page, recorder: TraceRecorder): Page {
  const proto = Object.getPrototypeOf(page);
  const handlers: Record<string, Function> = {};

  for (const name of LOCATOR_CREATORS) {
    const original = (page as any)[name]?.bind(page);
    if (typeof original === 'function') {
      handlers[name] = (...args: unknown[]) => {
        const loc = original(...args) as Locator;
        const strategy = name === 'locator' ? 'css' : name.replace('getBy', '').toLowerCase();
        const value = typeof args[0] === 'string' ? args[0] : String(args[0]);
        recorder.onLocatorResolve(strategy, value);
        return wrapLocator(loc, strategy, value, recorder);
      };
    }
  }

  return new Proxy(page, {
    get(target, prop, receiver) {
      if (typeof prop === 'string' && handlers[prop]) {
        return handlers[prop];
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}

function persistTrace(trace: ExecutionTrace, root: string): void {
  const tracesDir = join(root, '.testguardian', 'traces');
  if (!existsSync(tracesDir)) {
    mkdirSync(tracesDir, { recursive: true });
  }
  writeFileSync(join(tracesDir, `${trace.id}.json`), JSON.stringify(trace, null, 2), 'utf-8');
}

function projectRootFrom(testInfo: { file: string; config?: { rootDir?: string } }): string {
  if (testInfo.config?.rootDir) return testInfo.config.rootDir;
  const parts = testInfo.file.replace(/\\/g, '/').split('/');
  const testIdx = parts.lastIndexOf('tests');
  return testIdx > 0 ? parts.slice(0, testIdx).join('/') : process.cwd();
}
