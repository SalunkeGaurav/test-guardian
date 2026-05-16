/**
 * Patch Review Emitter
 *
 * Generates RuntimeHealingReviewPackage and emits deterministic runtime events.
 *
 * Reuses existing types from the codebase.
 *
 * @module patch-review-emitter
 */

import type { FailureContext } from '../../../core/runtime-healing-loop/types.js';
import type { HealingCandidate } from '../../../models/healing-candidate.js';
import type { ValidationResult } from '../../../models/validation.js';
import type { PatchProposal, PatchDiff, RollbackMetadata } from '../../../models/patch.js';
import type { HealingExplanation, ConfidenceBreakdown } from '../../../models/healing-explanation.js';
import type { GateResult } from '../../../core/pipeline/confidence-governance.js';
import type { RuntimeHealingReviewPackageOutput, RuntimeHealingEvent, HealingRetryResult } from './types.js';

let reviewCounter = 0;
function nextReviewId(): string {
  reviewCounter++;
  return `review-${reviewCounter}`;
}

let eventCounter = 0;
function nextEventId(): number {
  eventCounter++;
  return eventCounter;
}

/**
 * Generate a RuntimeHealingReviewPackage from a healing retry result.
 */
export function generateReviewPackage(
  failureContext: FailureContext,
  retryResult: HealingRetryResult,
  events: RuntimeHealingEvent[],
): RuntimeHealingReviewPackageOutput {
  const reviewId = nextReviewId();
  const candidate = retryResult.appliedCandidate;
  const patchProposal = retryResult.patchProposal;

  const confidenceBreakdown: ConfidenceBreakdown = candidate
    ? {
        overall: candidate.confidence,
        staticValidation: candidate.ranking.overall,
        runtimeValidation: candidate.ranking.replayContextConfidence,
        replayConsistency: candidate.ranking.survivabilityScore,
      }
    : {
        overall: 0,
        staticValidation: 0,
        runtimeValidation: 0,
        replayConsistency: 0,
      };

  const explainabilitySummary: HealingExplanation = candidate
    ? {
        proposalId: candidate.id,
        confidence: confidenceBreakdown,
        evidence: candidate.explanation?.evidence ?? [],
        reasoning: candidate.explanation?.reasoning ?? 'No explanation available',
      }
    : {
        proposalId: '',
        confidence: confidenceBreakdown,
        evidence: [],
        reasoning: 'No candidate available',
      };

  const patchDiff: PatchDiff = patchProposal?.patchDiff ?? {
    unifiedDiff: '',
    beforeSnippet: '',
    afterSnippet: '',
    beforeStartLine: failureContext.failingLine,
    beforeEndLine: failureContext.failingLine,
    afterStartLine: failureContext.failingLine,
    afterEndLine: failureContext.failingLine,
    addedLines: 0,
    removedLines: 0,
  };

  const rollbackMetadata: RollbackMetadata = patchProposal?.rollbackMetadata ?? {
    originalLocatorExpression: failureContext.failedLocatorExpression,
    originalStrategy: 'unknown',
    originalValue: failureContext.failedLocatorExpression,
    originalSourceFile: failureContext.failingFile,
    originalLine: failureContext.failingLine,
    originalColumn: 0,
    patchReversalCode: '',
    validationIds: [],
    replaySessionIds: [],
    createdAt: 0,
  };

  const status = retryResult.success
    ? 'healed-at-runtime'
    : retryResult.failureReason?.includes('governance')
      ? 'rejected'
      : retryResult.failureReason?.includes('sandbox')
        ? 'sandbox-failed'
        : 'ready-for-review';

  return {
    reviewId,
    testFile: failureContext.failingFile,
    testName: '',
    failureContext,
    originalLocator: failureContext.failedLocatorExpression,
    healedLocator: candidate?.proposedExpression ?? failureContext.failedLocatorExpression,
    confidenceBreakdown,
    replayEvidence: {
      validationResults: [],
      replayDivergences: [],
    },
    sandboxVerification: {
      compileSuccess: retryResult.success,
      replaySuccess: retryResult.success,
      noNavigationDivergence: true,
      noNewFailures: retryResult.success,
      isolationVerified: true,
      sandboxId: '',
    },
    governanceReasoning: {
      governanceResult: retryResult.success,
      gateResults: retryResult.rejectedCandidates.map((r) => ({
        gate: 'confidence-threshold',
        passed: false,
        detail: r.reason,
      })),
    },
    explainabilitySummary,
    patchDiff,
    rollbackMetadata,
    status,
    createdAt: 0,
    runtimeEvents: events,
  };
}

/**
 * Emit a deterministic runtime event.
 */
export function emitRuntimeEvent(
  type: RuntimeHealingEvent['type'],
  testFile: string,
  testName: string,
  locatorExpression: string,
  details: Record<string, unknown> = {},
): RuntimeHealingEvent {
  return {
    eventId: nextEventId(),
    type,
    testFile,
    testName,
    locatorExpression,
    details,
  };
}

/**
 * Format a review package for console output.
 */
export function formatReviewForConsole(review: RuntimeHealingReviewPackageOutput): string {
  const lines: string[] = [];
  lines.push(`=== Runtime Healing Review ===`);
  lines.push(`Review ID:        ${review.reviewId}`);
  lines.push(`Test File:        ${review.testFile}`);
  lines.push(`Test Name:        ${review.testName}`);
  lines.push(`Status:           ${review.status}`);
  lines.push('');
  lines.push(`Original Locator: ${review.originalLocator}`);
  lines.push(`Healed Locator:   ${review.healedLocator}`);
  lines.push(`Confidence:       ${review.confidenceBreakdown.overall.toFixed(2)}`);
  lines.push('');
  lines.push(`Governance:       ${review.governanceReasoning.governanceResult ? 'PASSED' : 'FAILED'}`);
  lines.push(`Sandbox Compile:  ${review.sandboxVerification.compileSuccess ? 'PASSED' : 'FAILED'}`);
  lines.push(`Sandbox Replay:   ${review.sandboxVerification.replaySuccess ? 'PASSED' : 'FAILED'}`);
  lines.push('');

  if (review.runtimeEvents.length > 0) {
    lines.push('Runtime Events:');
    for (const event of review.runtimeEvents) {
      lines.push(`  [${event.type}] ${event.locatorExpression}`);
    }
    lines.push('');
  }

  if (review.patchDiff.unifiedDiff) {
    lines.push('Patch Diff:');
    lines.push(review.patchDiff.unifiedDiff);
    lines.push('');
  }

  return lines.join('\n');
}
