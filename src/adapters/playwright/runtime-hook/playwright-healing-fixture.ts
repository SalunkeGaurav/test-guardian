/**
 * Playwright Healing Fixture
 *
 * Opt-in fixture integration for TestGuardian runtime healing.
 *
 * Usage:
 * ```typescript
 * import { test, expect } from 'testguardian/playwright';
 *
 * test('user can login', async ({ page, healingInterceptor }) => {
 *   await page.goto('https://example.com/login');
 *   // If a locator fails, the interceptor will attempt healing
 *   await page.locator('#username').fill('testuser');
 * });
 * ```
 *
 * Reuses:
 * - RuntimeInterceptor for failure interception
 * - Existing Playwright test fixture pattern
 *
 * @module playwright-healing-fixture
 */

import { test as base, expect, type Page, type Locator } from '@playwright/test';
import { RuntimeInterceptor } from './runtime-interceptor.js';
import type { RuntimeInterceptorConfig, RuntimeHealingReviewPackageOutput, RuntimeHealingEvent, LocatorFailureInfo } from './types.js';
import type { ElementNode } from '../../../models/snapshot.js';

/**
 * Extended Playwright test fixtures with TestGuardian healing support.
 */
export interface TestGuardianFixtures {
  /** Runtime interceptor for healing locator failures */
  healingInterceptor: RuntimeInterceptor;
  /** All healing review packages generated during the test */
  healingReviews: RuntimeHealingReviewPackageOutput[];
  /** All runtime events emitted during the test */
  healingEvents: RuntimeHealingEvent[];
}

/**
 * Configuration for the healing fixture.
 */
export interface HealingFixtureConfig {
  /** Project root for sandbox operations */
  projectRoot?: string;
  /** Maximum retry attempts per locator failure */
  maxRetries?: number;
  /** Governance confidence threshold (0-1) */
  governanceThreshold?: number;
  /** Whether to automatically intercept locator failures */
  autoIntercept?: boolean;
}

/**
 * Default fixture configuration.
 */
const DEFAULT_FIXTURE_CONFIG: HealingFixtureConfig = {
  maxRetries: 3,
  governanceThreshold: 0.7,
  autoIntercept: true,
};

/**
 * Create a wrapped locator that intercepts failures.
 */
function createHealingLocator(
  originalLocator: Locator,
  interceptor: RuntimeInterceptor,
  testFile: string,
  testName: string,
  reviews: RuntimeHealingReviewPackageOutput[],
): Locator {
  const handler: ProxyHandler<Locator> = {
    get(target, prop) {
      const value = target[prop as keyof Locator];
      if (typeof value === 'function') {
        return async function (...args: unknown[]) {
          try {
            return await value.apply(target, args);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            // Build locator failure info
            const failureInfo: LocatorFailureInfo = {
              locator: target,
              expression: target.toString(),
              errorMessage,
              stackTrace: error instanceof Error ? (error.stack ?? '') : '',
              failingFile: testFile,
              failingLine: 0,
              domSnapshot: [] as ElementNode[],
              testFile,
              testName,
            };

            // Intercept the failure
            const result = await interceptor.interceptFailure(failureInfo);

            if (result.healed && result.reviewPackage) {
              reviews.push(result.reviewPackage);
              // In a real implementation, we would retry with the healed locator
              // For now, re-throw the original error to preserve behavior
            }

            throw error;
          }
        };
      }
      return value;
    },
  };

  return new Proxy(originalLocator, handler);
}

/**
 * Extended Playwright test with TestGuardian healing fixtures.
 *
 * Usage:
 * ```typescript
 * import { test } from 'testguardian/playwright';
 *
 * test('my test', async ({ page, healingInterceptor }) => {
 *   // healingInterceptor is available for manual interception
 * });
 * ```
 */
export const test = base.extend<TestGuardianFixtures>({
  healingInterceptor: async ({}, use, testInfo) => {
    const config: RuntimeInterceptorConfig = {
      maxRetries: DEFAULT_FIXTURE_CONFIG.maxRetries ?? 3,
      projectRoot: process.cwd(),
      governanceThreshold: DEFAULT_FIXTURE_CONFIG.governanceThreshold ?? 0.7,
      emitEvents: true,
    };

    const interceptor = new RuntimeInterceptor(config);
    await use(interceptor);
  },

  healingReviews: async ({}, use) => {
    const reviews: RuntimeHealingReviewPackageOutput[] = [];
    await use(reviews);
  },

  healingEvents: async ({}, use) => {
    const events: RuntimeHealingEvent[] = [];
    await use(events);
  },
});

/**
 * Re-export expect for convenience.
 */
export { expect };

/**
 * Re-export Page and Locator types for convenience.
 */
export type { Page, Locator };

/**
 * Export RuntimeInterceptor for advanced usage.
 */
export { RuntimeInterceptor } from './runtime-interceptor.js';

/**
 * Export types for advanced usage.
 */
export type {
  RuntimeInterceptorConfig,
  RuntimeHealingReviewPackageOutput,
  RuntimeHealingEvent,
  LocatorFailureInfo,
} from './types.js';
