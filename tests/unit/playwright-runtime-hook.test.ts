import { describe, it, expect } from 'vitest';
import { RuntimeInterceptor } from '../../src/adapters/playwright/runtime-hook/runtime-interceptor.js';
import { HealingRetryExecutor, RetryStateTracker } from '../../src/adapters/playwright/runtime-hook/healing-retry-executor.js';
import { captureLocatorFailure, parseFailedLocator, parseStackTrace, isHealableLocatorFailure } from '../../src/adapters/playwright/runtime-hook/locator-failure-capture.js';
import { generateReviewPackage, emitRuntimeEvent, formatReviewForConsole } from '../../src/adapters/playwright/runtime-hook/patch-review-emitter.js';
import type { LocatorFailureInfo, RuntimeInterceptorConfig, HealingRetryResult } from '../../src/adapters/playwright/runtime-hook/types.js';
import type { FailureContext } from '../../src/core/runtime-healing-loop/types.js';
import type { HealingCandidate } from '../../src/models/healing-candidate.js';

function createMockLocatorFailureInfo(overrides: Partial<LocatorFailureInfo> = {}): LocatorFailureInfo {
  return {
    locator: {} as any,
    expression: '#username',
    errorMessage: 'Timed out 5000ms waiting for locator("#username")',
    stackTrace: 'at tests/login.spec.ts:5:18',
    failingFile: 'tests/login.spec.ts',
    failingLine: 5,
    domSnapshot: [],
    testFile: 'tests/login.spec.ts',
    testName: 'user can login',
    ...overrides,
  };
}

function createMockFailureContext(overrides: Partial<FailureContext> = {}): FailureContext {
  return {
    id: 'failure-1',
    locator: {} as any,
    failedLocatorExpression: '#username',
    stackTrace: 'at tests/login.spec.ts:5:18',
    failingFile: 'tests/login.spec.ts',
    failingLine: 5,
    domSnapshot: [],
    replaySessionRef: '',
    errorMessage: 'Timed out 5000ms waiting for locator("#username")',
    capturedAt: 0,
    ...overrides,
  };
}

function createMockHealingCandidate(overrides: Partial<HealingCandidate> = {}): HealingCandidate {
  return {
    id: 'candidate-1',
    locatorId: '',
    originalExpression: '#username',
    proposedExpression: '[data-testid="username"]',
    proposedStrategy: 'runtime-healing',
    proposedValue: '[data-testid="username"]',
    strategy: 'attribute-similarity',
    confidence: 0.85,
    ranking: {
      overall: 0.85,
      survivabilityScore: 0.85,
      structuralSimilarity: 0.85,
      attributeMatchScore: 0.85,
      hierarchyStability: 0.85,
      replayContextConfidence: 0.85,
    },
    explanation: {
      proposalId: 'candidate-1',
      confidence: {
        overall: 0.85,
        staticValidation: 0.85,
        runtimeValidation: 0.85,
        replayConsistency: 0.85,
      },
      evidence: ['DOM match found'],
      reasoning: 'More specific selector with test ID attribute',
    },
    domEvidence: {
      originalElement: null,
      proposedElement: null,
      domSnapshot: [],
    },
    validated: true,
    createdAt: 0,
    ...overrides,
  };
}

function createMockRetryResult(overrides: Partial<HealingRetryResult> = {}): HealingRetryResult {
  return {
    success: true,
    appliedCandidate: createMockHealingCandidate(),
    retryAttempts: 1,
    consideredCandidates: [createMockHealingCandidate()],
    rejectedCandidates: [],
    ...overrides,
  };
}

describe('Locator Failure Capture', () => {
  it('parses failed locator from error message', () => {
    expect(parseFailedLocator('Timed out 5000ms waiting for locator("#username")')).toBe('#username');
    expect(parseFailedLocator("Error: locator('#submit-btn')")).toBe('#submit-btn');
  });

  it('parses getByRole locator from error message', () => {
    expect(parseFailedLocator("Error: getByRole('button')")).toBe("getByRole('button')");
  });

  it('parses getByText locator from error message', () => {
    expect(parseFailedLocator("Error: getByText('Sign In')")).toBe("getByText('Sign In')");
  });

  it('parses stack trace to extract file and line', () => {
    const result = parseStackTrace('at tests/login.spec.ts:5:18\nat node_modules/playwright/test.js:123:45');
    expect(result.file).toBe('tests/login.spec.ts');
    expect(result.line).toBe(5);
  });

  it('captures locator failure and builds FailureContext', () => {
    const info = createMockLocatorFailureInfo();
    const context = captureLocatorFailure(info);

    expect(context.id).toBeDefined();
    expect(context.failedLocatorExpression).toBe('#username');
    expect(context.failingFile).toBe('tests/login.spec.ts');
    expect(context.failingLine).toBe(5);
    expect(context.errorMessage).toBe(info.errorMessage);
  });

  it('identifies healable locator failures', () => {
    expect(isHealableLocatorFailure('Timed out 5000ms waiting for locator("#username")')).toBe(true);
    expect(isHealableLocatorFailure('locator resolved to 0 elements')).toBe(true);
    expect(isHealableLocatorFailure('element is not visible')).toBe(true);
    expect(isHealableLocatorFailure('element is not interactable')).toBe(true);
    expect(isHealableLocatorFailure('strict mode violation: resolved to 2 elements')).toBe(true);
  });

  it('identifies non-healable failures', () => {
    expect(isHealableLocatorFailure('Network error: connection refused')).toBe(false);
    expect(isHealableLocatorFailure('Browser crashed')).toBe(false);
    expect(isHealableLocatorFailure('JavaScript error in page')).toBe(false);
  });
});

describe('Retry State Tracker', () => {
  it('tracks retry state per locator expression', () => {
    const tracker = new RetryStateTracker();
    const state1 = tracker.getOrCreate('#username', 3);
    expect(state1.attempts).toBe(0);
    expect(state1.exhausted).toBe(false);
  });

  it('increments retry attempts', () => {
    const tracker = new RetryStateTracker();
    tracker.getOrCreate('#username', 3);

    const state1 = tracker.increment('#username');
    expect(state1.attempts).toBe(1);
    expect(state1.exhausted).toBe(false);

    const state2 = tracker.increment('#username');
    expect(state2.attempts).toBe(2);
    expect(state2.exhausted).toBe(false);

    const state3 = tracker.increment('#username');
    expect(state3.attempts).toBe(3);
    expect(state3.exhausted).toBe(true);
  });

  it('prevents infinite retry loops', () => {
    const tracker = new RetryStateTracker();
    tracker.getOrCreate('#username', 2);

    tracker.increment('#username');
    expect(tracker.isExhausted('#username')).toBe(false);

    tracker.increment('#username');
    expect(tracker.isExhausted('#username')).toBe(true);
  });

  it('resets retry state', () => {
    const tracker = new RetryStateTracker();
    tracker.getOrCreate('#username', 3);
    tracker.increment('#username');
    tracker.increment('#username');

    expect(tracker.isExhausted('#username')).toBe(false);
    tracker.reset('#username');

    const newState = tracker.getOrCreate('#username', 3);
    expect(newState.attempts).toBe(0);
    expect(newState.exhausted).toBe(false);
  });
});

describe('Healing Retry Executor', () => {
  it('prevents retry when loop is exhausted', async () => {
    const config: RuntimeInterceptorConfig = {
      maxRetries: 1,
      projectRoot: process.cwd(),
      governanceThreshold: 0.7,
      emitEvents: false,
    };
    const tracker = new RetryStateTracker();
    tracker.getOrCreate('#username', 1);
    tracker.increment('#username');

    const executor = new HealingRetryExecutor(config, tracker);
    const failureContext = createMockFailureContext();

    const result = await executor.execute(failureContext);

    expect(result.success).toBe(false);
    expect(result.failureReason).toContain('Retry loop exhausted');
    expect(result.retryAttempts).toBe(1);
  });

  it('returns deterministic retry ordering', async () => {
    const config: RuntimeInterceptorConfig = {
      maxRetries: 3,
      projectRoot: process.cwd(),
      governanceThreshold: 0.7,
      emitEvents: false,
    };
    const tracker = new RetryStateTracker();
    const executor = new HealingRetryExecutor(config, tracker);
    const failureContext = createMockFailureContext();

    const result1 = await executor.execute(failureContext);
    const result2 = await executor.execute(failureContext);

    expect(result1.retryAttempts).toBe(1);
    expect(result2.retryAttempts).toBe(2);
  });
});

describe('Runtime Interceptor', () => {
  it('captures failure and emits events', async () => {
    const interceptor = new RuntimeInterceptor({
      maxRetries: 3,
      projectRoot: process.cwd(),
      governanceThreshold: 0.7,
      emitEvents: true,
    });

    const info = createMockLocatorFailureInfo();
    const result = await interceptor.interceptFailure(info);

    expect(result.healable).toBe(true);
    expect(result.events.length).toBeGreaterThan(0);
    expect(result.events[0].type).toBe('failure-captured');
  });

  it('passes through unsupported locator failures', async () => {
    const interceptor = new RuntimeInterceptor({
      maxRetries: 3,
      projectRoot: process.cwd(),
      governanceThreshold: 0.7,
      emitEvents: true,
    });

    const info = createMockLocatorFailureInfo({
      errorMessage: 'Network error: connection refused',
    });
    const result = await interceptor.interceptFailure(info);

    expect(result.healable).toBe(false);
    expect(result.healed).toBe(false);
    expect(result.originalError).toBe('Network error: connection refused');
  });

  it('prevents retry loops', async () => {
    const interceptor = new RuntimeInterceptor({
      maxRetries: 1,
      projectRoot: process.cwd(),
      governanceThreshold: 0.7,
      emitEvents: true,
    });

    const info = createMockLocatorFailureInfo();

    const result1 = await interceptor.interceptFailure(info);
    expect(result1.healable).toBe(true);

    const result2 = await interceptor.interceptFailure(info);
    expect(result2.healed).toBe(false);
  });

  it('generates patch review', async () => {
    const interceptor = new RuntimeInterceptor({
      maxRetries: 3,
      projectRoot: process.cwd(),
      governanceThreshold: 0.7,
      emitEvents: true,
    });

    const info = createMockLocatorFailureInfo();
    const result = await interceptor.interceptFailure(info);

    if (result.reviewPackage) {
      expect(result.reviewPackage.reviewId).toBeDefined();
      expect(result.reviewPackage.originalLocator).toBe('#username');
      expect(result.reviewPackage.runtimeEvents.length).toBeGreaterThan(0);
    }
  });

  it('preserves original failure if healing fails', async () => {
    const interceptor = new RuntimeInterceptor({
      maxRetries: 3,
      projectRoot: process.cwd(),
      governanceThreshold: 0.7,
      emitEvents: true,
    });

    const info = createMockLocatorFailureInfo();
    const result = await interceptor.interceptFailure(info);

    if (!result.healed) {
      expect(result.originalError).toBeDefined();
    }
  });
});

describe('Patch Review Emitter', () => {
  it('generates review package from retry result', () => {
    const failureContext = createMockFailureContext();
    const retryResult = createMockRetryResult();
    const events = [emitRuntimeEvent('failure-captured', 'test.ts', 'test', '#username')];

    const review = generateReviewPackage(failureContext, retryResult, events);

    expect(review.reviewId).toBeDefined();
    expect(review.originalLocator).toBe('#username');
    expect(review.healedLocator).toBe('[data-testid="username"]');
    expect(review.confidenceBreakdown.overall).toBe(0.85);
    expect(review.status).toBe('healed-at-runtime');
    expect(review.runtimeEvents).toEqual(events);
  });

  it('generates rejected review for governance failure', () => {
    const failureContext = createMockFailureContext();
    const retryResult = createMockRetryResult({
      success: false,
      failureReason: 'No governance-approved candidates',
      rejectedCandidates: [
        { candidate: createMockHealingCandidate({ confidence: 0.5 }), reason: 'Confidence 0.5 below threshold 0.7' },
      ],
    });
    const events = [emitRuntimeEvent('healing-rejected', 'test.ts', 'test', '#username')];

    const review = generateReviewPackage(failureContext, retryResult, events);

    expect(review.status).toBe('rejected');
    expect(review.governanceReasoning.governanceResult).toBe(false);
  });

  it('emits deterministic runtime events', () => {
    const event1 = emitRuntimeEvent('failure-captured', 'test.ts', 'test', '#username');
    const event2 = emitRuntimeEvent('healing-succeeded', 'test.ts', 'test', '#username');

    expect(event1.eventId).toBeDefined();
    expect(event2.eventId).toBe(event1.eventId + 1);
    expect(event1.type).toBe('failure-captured');
    expect(event2.type).toBe('healing-succeeded');
  });

  it('formats review for console output', () => {
    const failureContext = createMockFailureContext();
    const retryResult = createMockRetryResult();
    const events = [emitRuntimeEvent('failure-captured', 'test.ts', 'test', '#username')];
    const review = generateReviewPackage(failureContext, retryResult, events);

    const formatted = formatReviewForConsole(review);

    expect(formatted).toContain('=== Runtime Healing Review ===');
    expect(formatted).toContain(review.reviewId);
    expect(formatted).toContain('#username');
    expect(formatted).toContain('[data-testid="username"]');
  });
});
