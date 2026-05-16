/**
 * Playwright Runtime Healing Hook
 *
 * Enables TestGuardian to intercept real Playwright locator failures
 * during execution, invoke the existing healing pipeline, retry with
 * validated healed locators, and generate developer review patches.
 *
 * Usage:
 * ```typescript
 * import { test, expect } from 'testguardian/playwright';
 *
 * test('user can login', async ({ page, healingInterceptor }) => {
 *   await page.goto('https://example.com/login');
 *   await page.locator('#username').fill('testuser');
 * });
 * ```
 *
 * Or manually:
 * ```typescript
 * import { RuntimeInterceptor } from 'testguardian/playwright/runtime-hook';
 *
 * const interceptor = new RuntimeInterceptor({ projectRoot: '/path/to/project' });
 * const result = await interceptor.interceptFailure({ ... });
 * ```
 *
 * @module playwright-runtime-hook
 */

export { RuntimeInterceptor } from './runtime-interceptor.js';
export { HealingRetryExecutor, RetryStateTracker } from './healing-retry-executor.js';
export { captureLocatorFailure, parseFailedLocator, parseStackTrace, isHealableLocatorFailure } from './locator-failure-capture.js';
export { generateReviewPackage, emitRuntimeEvent, formatReviewForConsole } from './patch-review-emitter.js';
export { test, expect } from './playwright-healing-fixture.js';

export type {
  RuntimeInterceptorConfig,
  RuntimeHealingEvent,
  HealingRetryResult,
  RetryState,
  RuntimeHealingReviewPackageOutput,
  LocatorFailureInfo,
} from './types.js';

export type { TestGuardianFixtures, HealingFixtureConfig } from './playwright-healing-fixture.js';
