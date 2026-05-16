/**
 * Healing Retry Executor
 *
 * Invokes the existing healing pipeline for a captured failure,
 * retries with governance-approved candidates only,
 * and prevents infinite retry loops.
 *
 * Reuses:
 * - RuntimeHealingLoop for candidate generation and validation
 * - ConfidenceGovernance for approval gates
 * - MutationSandbox for sandbox verification
 *
 * @module healing-retry-executor
 */

import type { FailureContext } from '../../../core/runtime-healing-loop/types.js';
import type { HealingCandidate } from '../../../models/healing-candidate.js';
import type { ValidationResult } from '../../../models/validation.js';
import type { PatchProposal } from '../../../models/patch.js';
import type { HealingRetryResult, RetryState, RuntimeInterceptorConfig } from './types.js';
import { RuntimeHealingLoop } from '../../../core/runtime-healing-loop/runtime-healing-loop.js';
import { PatchGenerator } from '../../../core/patcher/patch-generator.js';

/**
 * Track retry state per locator expression to prevent infinite loops.
 */
export class RetryStateTracker {
  private states = new Map<string, RetryState>();

  getOrCreate(locatorExpression: string, maxAttempts: number): RetryState {
    const existing = this.states.get(locatorExpression);
    if (existing) return existing;

    const state: RetryState = {
      locatorExpression,
      attempts: 0,
      maxAttempts,
      exhausted: false,
    };
    this.states.set(locatorExpression, state);
    return state;
  }

  increment(locatorExpression: string): RetryState {
    const state = this.states.get(locatorExpression);
    if (!state) {
      throw new Error(`No retry state for locator: ${locatorExpression}`);
    }
    state.attempts++;
    if (state.attempts >= state.maxAttempts) {
      state.exhausted = true;
    }
    return state;
  }

  isExhausted(locatorExpression: string): boolean {
    const state = this.states.get(locatorExpression);
    return state?.exhausted ?? false;
  }

  reset(locatorExpression: string): void {
    this.states.delete(locatorExpression);
  }
}

/**
 * Execute healing retry for a captured failure.
 *
 * Flow:
 * 1. Check retry state (prevent infinite loops)
 * 2. Invoke RuntimeHealingLoop for candidate generation
 * 3. Filter candidates by governance approval
 * 4. Generate patch for top approved candidate
 * 5. Return retry result
 */
export class HealingRetryExecutor {
  private readonly config: RuntimeInterceptorConfig;
  private readonly retryTracker: RetryStateTracker;
  private readonly healingLoop: RuntimeHealingLoop;
  private readonly patchGenerator: PatchGenerator;

  constructor(config: RuntimeInterceptorConfig, retryTracker?: RetryStateTracker) {
    this.config = config;
    this.retryTracker = retryTracker ?? new RetryStateTracker();
    this.healingLoop = new RuntimeHealingLoop(config.projectRoot);
    this.patchGenerator = new PatchGenerator();
  }

  /**
   * Execute healing retry for a captured failure.
   *
   * Returns HealingRetryResult with:
   * - success: whether healing was successful
   * - appliedCandidate: the candidate that was applied (if successful)
   * - patchProposal: generated patch (if successful)
   * - failureReason: reason for failure (if unsuccessful)
   * - retryAttempts: number of attempts made
   * - consideredCandidates: all candidates considered
   * - rejectedCandidates: candidates rejected by governance
   */
  async execute(failureContext: FailureContext): Promise<HealingRetryResult> {
    const retryState = this.retryTracker.getOrCreate(
      failureContext.failedLocatorExpression,
      this.config.maxRetries,
    );

    if (retryState.exhausted) {
      return {
        success: false,
        failureReason: `Retry loop exhausted for locator: ${failureContext.failedLocatorExpression}`,
        retryAttempts: retryState.attempts,
        consideredCandidates: [],
        rejectedCandidates: [],
      };
    }

    retryState.attempts++;

    try {
      const loopResult = await this.healingLoop.execute({
        failureContext,
        projectRoot: this.config.projectRoot,
        governanceThreshold: this.config.governanceThreshold,
      });

      const reviewPackage = loopResult.reviewPackage;
      const candidates = this.extractCandidatesFromReview(reviewPackage);
      const approvedCandidates = candidates.filter((c) => c.confidence >= this.config.governanceThreshold);
      const rejectedCandidates = candidates
        .filter((c) => c.confidence < this.config.governanceThreshold)
        .map((c) => ({ candidate: c, reason: `Confidence ${c.confidence} below threshold ${this.config.governanceThreshold}` }));

      if (approvedCandidates.length === 0) {
        retryState.lastFailureReason = 'No governance-approved candidates';
        return {
          success: false,
          failureReason: 'No governance-approved candidates',
          retryAttempts: retryState.attempts,
          consideredCandidates: candidates,
          rejectedCandidates,
        };
      }

      const topCandidate = approvedCandidates[0];

      let patchProposal: PatchProposal | undefined;
      try {
        const patchResult = this.patchGenerator.generate({
          candidate: topCandidate,
          targetFile: failureContext.failingFile,
          targetLine: failureContext.failingLine,
        });
        if (patchResult.ok) {
          patchProposal = patchResult.value;
        }
      } catch {
        // Patch generation failed, but healing may still be valid
      }

      if (reviewPackage.status === 'ready-for-review' || reviewPackage.status === 'healed-at-runtime') {
        this.retryTracker.reset(failureContext.failedLocatorExpression);
        return {
          success: true,
          appliedCandidate: topCandidate,
          patchProposal,
          retryAttempts: retryState.attempts,
          consideredCandidates: candidates,
          rejectedCandidates,
        };
      }

      retryState.lastFailureReason = `Healing status: ${reviewPackage.status}`;
      return {
        success: false,
        failureReason: `Healing status: ${reviewPackage.status}`,
        retryAttempts: retryState.attempts,
        consideredCandidates: candidates,
        rejectedCandidates,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      retryState.lastFailureReason = message;

      if (retryState.exhausted) {
        return {
          success: false,
          failureReason: `Retry loop exhausted: ${message}`,
          retryAttempts: retryState.attempts,
          consideredCandidates: [],
          rejectedCandidates: [],
        };
      }

      return {
        success: false,
        failureReason: message,
        retryAttempts: retryState.attempts,
        consideredCandidates: [],
        rejectedCandidates: [],
      };
    }
  }

  /**
   * Reset retry state for a locator expression.
   */
  reset(locatorExpression: string): void {
    this.retryTracker.reset(locatorExpression);
  }

  /**
   * Check if retry loop is exhausted for a locator expression.
   */
  isExhausted(locatorExpression: string): boolean {
    return this.retryTracker.isExhausted(locatorExpression);
  }

  /**
   * Extract candidates from a review package.
   */
  private extractCandidatesFromReview(reviewPackage: {
    failureContext: FailureContext;
    originalLocator: string;
    healedLocator: string;
    confidenceBreakdown: { overall: number };
    status: string;
  }): HealingCandidate[] {
    const candidates: HealingCandidate[] = [];

    if (reviewPackage.healedLocator && reviewPackage.healedLocator !== reviewPackage.originalLocator) {
      const confidence = reviewPackage.confidenceBreakdown?.overall ?? 0;
      candidates.push({
        id: `candidate-${candidates.length + 1}`,
        locatorId: '',
        originalExpression: reviewPackage.originalLocator,
        proposedExpression: reviewPackage.healedLocator,
        proposedStrategy: 'runtime-healing',
        proposedValue: reviewPackage.healedLocator,
        strategy: 'attribute-similarity',
        confidence,
        ranking: {
          overall: confidence,
          survivabilityScore: confidence,
          structuralSimilarity: confidence,
          attributeMatchScore: confidence,
          hierarchyStability: confidence,
          replayContextConfidence: confidence,
        },
        explanation: {
          proposalId: '',
          confidence: {
            overall: confidence,
            staticValidation: confidence,
            runtimeValidation: confidence,
            replayConsistency: confidence,
          },
          evidence: [],
          reasoning: 'Runtime healing candidate',
        },
        domEvidence: {
          originalElement: null,
          proposedElement: null,
          domSnapshot: [],
        },
        validated: confidence >= this.config.governanceThreshold,
        createdAt: 0,
      });
    }

    return candidates;
  }
}
