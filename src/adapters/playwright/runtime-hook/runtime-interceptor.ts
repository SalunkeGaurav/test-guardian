/**
 * Runtime Interceptor
 *
 * Main interceptor that orchestrates:
 * 1. Failure capture via locator-failure-capture
 * 2. Healing retry via healing-retry-executor
 * 3. Review emission via patch-review-emitter
 *
 * Reuses existing modules only.
 *
 * @module runtime-interceptor
 */

import type { Locator } from '../../../models/locator.js';
import type { ElementNode } from '../../../models/snapshot.js';
import type { FailureContext } from '../../../core/runtime-healing-loop/types.js';
import type { RuntimeInterceptorConfig, RuntimeHealingEvent, HealingRetryResult, RuntimeHealingReviewPackageOutput, LocatorFailureInfo } from './types.js';
import { DEFAULT_INTERCEPTOR_CONFIG } from './types.js';
import { captureLocatorFailure, isHealableLocatorFailure } from './locator-failure-capture.js';
import { HealingRetryExecutor } from './healing-retry-executor.js';
import { generateReviewPackage, emitRuntimeEvent, formatReviewForConsole } from './patch-review-emitter.js';

/**
 * Result of intercepting a locator failure.
 */
export interface InterceptorResult {
  /** Whether the failure was healable */
  healable: boolean;
  /** Whether healing was successful */
  healed: boolean;
  /** Review package generated (if healable) */
  reviewPackage?: RuntimeHealingReviewPackageOutput;
  /** Original error message (if not healable or healing failed) */
  originalError?: string;
  /** Runtime events emitted */
  events: RuntimeHealingEvent[];
}

/**
 * Runtime Interceptor for Playwright locator failures.
 *
 * Usage:
 * ```typescript
 * const interceptor = new RuntimeInterceptor({ projectRoot: '/path/to/project' });
 * const result = await interceptor.interceptFailure({
 *   locator: page.locator('#username'),
 *   expression: '#username',
 *   errorMessage: 'Timed out waiting for locator...',
 *   stackTrace: 'at tests/login.spec.ts:5:18',
 *   failingFile: 'tests/login.spec.ts',
 *   failingLine: 5,
 *   domSnapshot: [...],
 *   testFile: 'tests/login.spec.ts',
 *   testName: 'user can login',
 * });
 * ```
 */
export class RuntimeInterceptor {
  private readonly config: RuntimeInterceptorConfig;
  private readonly executor: HealingRetryExecutor;
  private readonly events: RuntimeHealingEvent[] = [];

  constructor(config?: Partial<RuntimeInterceptorConfig>) {
    this.config = { ...DEFAULT_INTERCEPTOR_CONFIG, ...config };
    this.executor = new HealingRetryExecutor(this.config);
  }

  /**
   * Intercept a locator failure during Playwright execution.
   *
   * Flow:
   * 1. Check if failure is healable
   * 2. If not, return passthrough result
   * 3. If healable, capture failure context
   * 4. Execute healing retry
   * 5. Generate review package
   * 6. Emit runtime events
   */
  async interceptFailure(info: LocatorFailureInfo): Promise<InterceptorResult> {
    const events: RuntimeHealingEvent[] = [];

    // Step 1: Check if failure is healable
    if (!isHealableLocatorFailure(info.errorMessage)) {
      events.push(emitRuntimeEvent(
        'failure-captured',
        info.testFile,
        info.testName,
        info.expression,
        { healable: false, reason: 'Unsupported failure type' },
      ));
      this.events.push(...events);
      return {
        healable: false,
        healed: false,
        originalError: info.errorMessage,
        events,
      };
    }

    // Step 2: Capture failure context
    const failureContext = captureLocatorFailure(info);
    events.push(emitRuntimeEvent(
      'failure-captured',
      info.testFile,
      info.testName,
      info.expression,
      { healable: true, failureId: failureContext.id },
    ));

    // Step 3: Check retry loop exhaustion
    if (this.executor.isExhausted(failureContext.failedLocatorExpression)) {
      events.push(emitRuntimeEvent(
        'retry-exhausted',
        info.testFile,
        info.testName,
        info.expression,
        { reason: 'Max retries exceeded' },
      ));
      this.events.push(...events);
      return {
        healable: true,
        healed: false,
        originalError: info.errorMessage,
        events,
      };
    }

    // Step 4: Execute healing retry
    let retryResult: HealingRetryResult;
    try {
      retryResult = await this.executor.execute(failureContext);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      events.push(emitRuntimeEvent(
        'healing-rejected',
        info.testFile,
        info.testName,
        info.expression,
        { reason: message },
      ));
      this.events.push(...events);
      return {
        healable: true,
        healed: false,
        originalError: message,
        events,
      };
    }

    // Step 5: Emit healing result event
    if (retryResult.success) {
      events.push(emitRuntimeEvent(
        'healing-succeeded',
        info.testFile,
        info.testName,
        info.expression,
        {
          candidate: retryResult.appliedCandidate?.proposedExpression,
          confidence: retryResult.appliedCandidate?.confidence,
          retryAttempts: retryResult.retryAttempts,
        },
      ));
    } else {
      events.push(emitRuntimeEvent(
        'healing-rejected',
        info.testFile,
        info.testName,
        info.expression,
        {
          reason: retryResult.failureReason,
          retryAttempts: retryResult.retryAttempts,
          rejectedCount: retryResult.rejectedCandidates.length,
        },
      ));
    }

    // Step 6: Generate review package
    const reviewPackage = generateReviewPackage(failureContext, retryResult, events);
    reviewPackage.testName = info.testName;

    events.push(emitRuntimeEvent(
      'review-emitted',
      info.testFile,
      info.testName,
      info.expression,
      { reviewId: reviewPackage.reviewId, status: reviewPackage.status },
    ));

    this.events.push(...events);

    return {
      healable: true,
      healed: retryResult.success,
      reviewPackage,
      originalError: retryResult.success ? undefined : retryResult.failureReason,
      events,
    };
  }

  /**
   * Get all runtime events emitted so far.
   */
  getEvents(): readonly RuntimeHealingEvent[] {
    return [...this.events];
  }

  /**
   * Clear all runtime events.
   */
  clearEvents(): void {
    this.events.length = 0;
  }

  /**
   * Reset retry state for a locator expression.
   */
  resetRetry(locatorExpression: string): void {
    this.executor.reset(locatorExpression);
  }

  /**
   * Format the latest review package for console output.
   */
  formatLatestReview(): string | undefined {
    const latestReview = this.events
      .filter((e) => e.type === 'review-emitted')
      .pop();

    if (!latestReview) return undefined;

    // Find the review package from the event details
    // This is a simplified version; in practice, you'd store reviews
    return undefined;
  }
}
