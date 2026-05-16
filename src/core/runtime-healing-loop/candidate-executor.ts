/**
 * CandidateExecutor
 *
 * Executes healing candidates through the existing validation and
 * governance pipeline, then rejects candidates that fail deterministic
 * rejection criteria.
 *
 * Reuses: HealingPipeline, ValidationEngine, ConfidenceGovernance
 * No new validation logic. No new ranking logic.
 */

import type { Result } from '../../models/result.js';
import type { HealingCandidate } from '../../models/healing-candidate.js';
import type { ValidationResult } from '../../models/validation.js';
import type { RuntimeValidationResult } from '../../models/runtime.js';
import type { ElementNode } from '../../models/snapshot.js';
import type { FailureContext } from './types.js';
import type { CandidateExecutionResult, RejectionCriteria } from './types.js';
import { success, failure } from '../../models/result.js';
import { ValidationEngine } from '../validation/engine.js';
import { ConfidenceGovernance } from '../pipeline/confidence-governance.js';
import type { GovernanceConfig, GovernanceResult } from '../pipeline/confidence-governance.js';

export interface CandidateExecutorInput {
  failureContext: FailureContext;
  candidates: HealingCandidate[];
  currentDom: ElementNode[];
  governanceConfig?: Partial<GovernanceConfig>;
}

export class CandidateExecutor {
  private readonly validationEngine: ValidationEngine;
  private readonly governance: ConfidenceGovernance;

  constructor(governanceConfig?: Partial<GovernanceConfig>) {
    this.validationEngine = new ValidationEngine();
    this.governance = new ConfidenceGovernance(governanceConfig);
  }

  /**
   * Execute all candidates through validation and governance.
   * Returns execution results with rejection status.
   */
  execute(input: CandidateExecutorInput): Result<CandidateExecutionResult[]> {
    try {
      const { candidates, currentDom, failureContext } = input;

      if (candidates.length === 0) {
        return failure('No healing candidates to execute');
      }

      const results: CandidateExecutionResult[] = [];

      for (const candidate of candidates) {
        const validation = this.validationEngine.validate({
          candidate,
          targetDom: currentDom,
          replaySession: failureContext.replaySession,
          stepIndex: 0,
        });

        if (!validation.ok) {
          results.push({
            candidate,
            validation: this.buildErrorValidation(candidate, validation.error),
            rejected: true,
            rejectionReasons: [`Validation error: ${validation.error}`],
          });
          continue;
        }

        const vr = validation.value;
        const validations = new Map<string, ValidationResult>([[candidate.id, vr]]);
        const govResult = this.governance.evaluate(candidates, validations, undefined);

        const rejectionCriteria = this.evaluateRejectionCriteria(candidate, vr, govResult);
        const rejectionReasons = this.buildRejectionReasons(rejectionCriteria, govResult);

        results.push({
          candidate,
          validation: vr,
          governanceResult: govResult.gates,
          rejected: rejectionCriteria.failsGovernance || rejectionCriteria.hasReplayDivergence || rejectionCriteria.causesStructuralInstability || rejectionCriteria.reducesUniquenessConfidence || rejectionCriteria.affectsUnrelatedSelectors,
          rejectionReasons,
        });
      }

      return success(results);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Select the safest approved candidate from execution results.
   * Returns the first non-rejected candidate (already ranked by HealingPipeline).
   */
  selectSafestCandidate(results: CandidateExecutionResult[]): Result<CandidateExecutionResult> {
    const approved = results.filter(r => !r.rejected);
    if (approved.length === 0) {
      return failure('No approved candidates after rejection filtering');
    }
    return success(approved[0]!);
  }

  private evaluateRejectionCriteria(
    candidate: HealingCandidate,
    validation: ValidationResult,
    governanceResult: GovernanceResult,
  ): RejectionCriteria {
    return {
      failsGovernance: !governanceResult.passed,
      hasReplayDivergence: validation.falsePositiveIndicators.some(
        fp => fp.type === 'detached-element' || fp.type === 'unstable-dynamic',
      ),
      causesStructuralInstability: candidate.ranking.structuralSimilarity < 0.3,
      reducesUniquenessConfidence: candidate.ranking.attributeMatchScore < 0.2,
      affectsUnrelatedSelectors: false,
    };
  }

  private buildRejectionReasons(
    criteria: RejectionCriteria,
    governanceResult: GovernanceResult,
  ): string[] {
    const reasons: string[] = [];
    if (criteria.failsGovernance) {
      for (const rejected of governanceResult.rejectedCandidates) {
        reasons.push(`Governance rejected: ${rejected.reason}`);
      }
    }
    if (criteria.hasReplayDivergence) {
      reasons.push('Replay divergence detected: structural instability in replay context');
    }
    if (criteria.causesStructuralInstability) {
      reasons.push('Structural similarity too low: candidate may cause instability');
    }
    if (criteria.reducesUniquenessConfidence) {
      reasons.push('Attribute match score too low: candidate lacks uniqueness');
    }
    if (criteria.affectsUnrelatedSelectors) {
      reasons.push('Candidate may affect unrelated selectors');
    }
    return reasons;
  }

  private buildErrorValidation(candidate: HealingCandidate, error: string): ValidationResult {
    return {
      id: `val-error-${candidate.id}`,
      proposalId: candidate.id,
      locatorId: candidate.locatorId,
      replaySessionId: 'none',
      status: 'error',
      matchedElementCount: 0,
      interactionSuccess: false,
      replayConfidence: 0,
      falsePositiveIndicators: [{ type: 'no-match', detail: error }],
      executionMetadata: { stepIndex: 0, actionType: 'click', pageUrl: '', frame: '', resolvedAt: 0 },
      failureReason: error,
      validatedAt: 0,
    };
  }
}
