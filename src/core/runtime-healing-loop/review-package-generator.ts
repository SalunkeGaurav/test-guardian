/**
 * ReviewPackageGenerator
 *
 * Generates a deterministic RuntimeHealingReviewPackage from the
 * complete healing loop results. This package is the final output
 * for developer review.
 *
 * Reuses: PatchGenerator, ExplainabilityEngine, AuditPersister
 * No new explainability logic. No new governance logic.
 */

import type { Result } from '../../models/result.js';
import type { PatchProposal, PatchDiff, RollbackMetadata } from '../../models/patch.js';
import type { HealingExplanation, ConfidenceBreakdown } from '../../models/healing-explanation.js';
import type { ValidationResult } from '../../models/validation.js';
import type { RuntimeValidationResult, ReplayDivergence } from '../../models/runtime.js';
import type { GovernanceResult, GateResult } from '../pipeline/confidence-governance.js';
import type { FailureContext, SandboxPatchResult, RuntimeHealingReviewPackage } from './types.js';
import { success, failure } from '../../models/result.js';
import { ExplainabilityEngine } from '../pipeline/explainability-engine.js';

let counter = 0;
function nextReviewId(): string {
  counter++;
  return `review-${counter}`;
}

export interface ReviewPackageInput {
  failureContext: FailureContext;
  selectedCandidate: {
    originalExpression: string;
    proposedExpression: string;
  };
  confidenceBreakdown: ConfidenceBreakdown;
  validationResults: ValidationResult[];
  runtimeValidation?: RuntimeValidationResult;
  replayDivergences: ReplayDivergence[];
  sandboxResult: SandboxPatchResult;
  governanceResult: GovernanceResult;
  gateResults: GateResult[];
  patchProposal: PatchProposal;
}

export class ReviewPackageGenerator {
  private readonly explainabilityEngine: ExplainabilityEngine;

  constructor() {
    this.explainabilityEngine = new ExplainabilityEngine();
  }

  /**
   * Generate a complete review package for developer approval.
   */
  generate(input: ReviewPackageInput): Result<RuntimeHealingReviewPackage> {
    try {
      const {
        failureContext,
        selectedCandidate,
        confidenceBreakdown,
        validationResults,
        runtimeValidation,
        replayDivergences,
        sandboxResult,
        governanceResult,
        gateResults,
        patchProposal,
      } = input;

      const acceptance = SandboxRevalidatorAcceptance.verify(sandboxResult);

      const explainabilityInput = validationResults.length > 0
        ? validationResults[0]
        : undefined;

      const explanation = this.explainabilityEngine.explain(
        this.buildCandidateFromInput(selectedCandidate, confidenceBreakdown, failureContext),
        explainabilityInput,
        runtimeValidation,
        undefined,
        undefined,
        governanceResult.rejectedCandidates.map(r => r.reason),
      );

      const status = acceptance.allPassed
        ? 'ready-for-review' as const
        : 'sandbox-failed' as const;

      const reviewPackage: RuntimeHealingReviewPackage = {
        reviewId: nextReviewId(),
        failureContext,
        originalLocator: selectedCandidate.originalExpression,
        healedLocator: selectedCandidate.proposedExpression,
        confidenceBreakdown,
        replayEvidence: {
          validationResults,
          runtimeValidation,
          sandboxReplay: sandboxResult.replayResult,
          replayDivergences,
        },
        sandboxVerification: {
          compileSuccess: acceptance.compileSuccess,
          replaySuccess: acceptance.replaySuccess,
          noNavigationDivergence: acceptance.noNavigationDivergence,
          noNewFailures: acceptance.noNewFailures,
          isolationVerified: sandboxResult.isolationVerified,
          sandboxId: sandboxResult.sandboxId,
        },
        governanceReasoning: {
          governanceResult,
          gateResults,
        },
        explainabilitySummary: explanation,
        patchDiff: patchProposal.patchDiff,
        rollbackMetadata: patchProposal.rollbackMetadata,
        status,
        createdAt: failureContext.capturedAt,
      };

      return success(reviewPackage);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  private buildCandidateFromInput(
    selectedCandidate: { originalExpression: string; proposedExpression: string },
    confidenceBreakdown: ConfidenceBreakdown,
    failureContext: FailureContext,
  ) {
    return {
      id: `cand-review-${failureContext.locator.id}`,
      locatorId: failureContext.locator.id,
      originalExpression: selectedCandidate.originalExpression,
      proposedExpression: selectedCandidate.proposedExpression,
      proposedStrategy: failureContext.locator.strategy,
      proposedValue: failureContext.locator.value,
      strategy: 'attribute-similarity' as const,
      confidence: confidenceBreakdown.overall,
      ranking: confidenceBreakdown,
      explanation: {
        whyMatched: 'Runtime healing candidate',
        structuralChanges: [],
        confidenceBreakdown,
        survivabilityReasoning: 'Candidate selected via runtime healing loop',
        attributeChanges: [],
        strategyApplied: 'attribute-similarity' as const,
      },
      domEvidence: {
        stableAttributeMatches: [],
      },
      validated: false,
      createdAt: failureContext.capturedAt,
    };
  }
}

const SandboxRevalidatorAcceptance = {
  verify(result: SandboxPatchResult): {
    compileSuccess: boolean;
    replaySuccess: boolean;
    noNavigationDivergence: boolean;
    noNewFailures: boolean;
    allPassed: boolean;
  } {
    const compileSuccess = result.compileResult.success;
    const replaySuccess = result.replayResult.success;
    const noNavigationDivergence = result.replayResult.divergedSteps === 0;
    const noNewFailures = result.replayResult.failedSteps === 0;

    return {
      compileSuccess,
      replaySuccess,
      noNavigationDivergence,
      noNewFailures,
      allPassed: compileSuccess && replaySuccess && noNavigationDivergence && noNewFailures,
    };
  },
};
