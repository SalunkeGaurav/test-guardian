/**
 * Playwright Runtime Healing Hook Types
 *
 * Shared type definitions for the runtime healing integration.
 * Reuses existing types from the codebase where possible.
 *
 * @module runtime-hook-types
 */

import type { Locator } from '../../../models/locator.js';
import type { ElementNode } from '../../../models/snapshot.js';
import type { HealingCandidate } from '../../../models/healing-candidate.js';
import type { ValidationResult } from '../../../models/validation.js';
import type { PatchProposal, PatchDiff, RollbackMetadata } from '../../../models/patch.js';
import type { HealingExplanation } from '../../../models/healing-explanation.js';
import type { ConfidenceBreakdown } from '../../../models/healing-explanation.js';
import type { GateResult } from '../../../core/pipeline/confidence-governance.js';
import type { FailureContext, RuntimeHealingReviewPackage, RuntimeHealingMetrics } from '../../../core/runtime-healing-loop/types.js';

/**
 * Runtime event emitted by the interceptor.
 * Deterministic: no timestamps, sequential event IDs.
 */
export interface RuntimeHealingEvent {
  eventId: number;
  type: 'failure-captured' | 'healing-attempted' | 'healing-succeeded' | 'healing-rejected' | 'retry-exhausted' | 'review-emitted';
  testFile: string;
  testName: string;
  locatorExpression: string;
  details: Record<string, unknown>;
}

/**
 * Configuration for the runtime interceptor.
 */
export interface RuntimeInterceptorConfig {
  /** Maximum retry attempts per locator failure (prevents infinite loops) */
  maxRetries: number;
  /** Project root for sandbox operations */
  projectRoot: string;
  /** Governance confidence threshold (0-1) */
  governanceThreshold: number;
  /** Whether to emit runtime events */
  emitEvents: boolean;
}

/**
 * Default configuration values.
 */
export const DEFAULT_INTERCEPTOR_CONFIG: RuntimeInterceptorConfig = {
  maxRetries: 3,
  projectRoot: process.cwd(),
  governanceThreshold: 0.7,
  emitEvents: true,
};

/**
 * Result of a healing retry attempt.
 */
export interface HealingRetryResult {
  /** Whether healing was successful */
  success: boolean;
  /** The healing candidate that was applied (if any) */
  appliedCandidate?: HealingCandidate;
  /** Validation result for the applied candidate */
  validationResult?: ValidationResult;
  /** Patch proposal generated (if any) */
  patchProposal?: PatchProposal;
  /** Reason for failure (if unsuccessful) */
  failureReason?: string;
  /** Number of retry attempts made */
  retryAttempts: number;
  /** All candidates that were considered */
  consideredCandidates: HealingCandidate[];
  /** All candidates that were rejected by governance */
  rejectedCandidates: Array<{ candidate: HealingCandidate; reason: string }>;
}

/**
 * Runtime healing review package (extends existing type with runtime-specific fields).
 */
export interface RuntimeHealingReviewPackageOutput {
  reviewId: string;
  testFile: string;
  testName: string;
  failureContext: FailureContext;
  originalLocator: string;
  healedLocator: string;
  confidenceBreakdown: ConfidenceBreakdown;
  replayEvidence: {
    validationResults: ValidationResult[];
    sandboxReplay?: Record<string, unknown>;
    replayDivergences: string[];
  };
  sandboxVerification: {
    compileSuccess: boolean;
    replaySuccess: boolean;
    noNavigationDivergence: boolean;
    noNewFailures: boolean;
    isolationVerified: boolean;
    sandboxId: string;
  };
  governanceReasoning: {
    governanceResult: boolean;
    gateResults: GateResult[];
  };
  explainabilitySummary: HealingExplanation;
  patchDiff: PatchDiff;
  rollbackMetadata: RollbackMetadata;
  status: 'ready-for-review' | 'rejected' | 'sandbox-failed' | 'healed-at-runtime';
  createdAt: number;
  runtimeEvents: RuntimeHealingEvent[];
}

/**
 * Locator failure captured during Playwright execution.
 */
export interface LocatorFailureInfo {
  /** The locator that failed */
  locator: Locator;
  /** The locator expression that failed */
  expression: string;
  /** Error message from Playwright */
  errorMessage: string;
  /** Stack trace from the failure */
  stackTrace: string;
  /** File where the failure occurred */
  failingFile: string;
  /** Line number where the failure occurred */
  failingLine: number;
  /** DOM snapshot at time of failure */
  domSnapshot: ElementNode[];
  /** Test file being executed */
  testFile: string;
  /** Test name being executed */
  testName: string;
}

/**
 * Retry state tracking for a single locator.
 */
export interface RetryState {
  /** Locator expression being retried */
  locatorExpression: string;
  /** Number of attempts made */
  attempts: number;
  /** Maximum allowed attempts */
  maxAttempts: number;
  /** Whether retry loop is exhausted */
  exhausted: boolean;
  /** Last failure reason */
  lastFailureReason?: string;
}
