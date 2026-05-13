/**
 * ValidationEngine
 *
 * Deterministic replay validation of healing proposals.
 *
 * For each proposal:
 * 1. Reconstruct replay context from ReplaySession
 * 2. Resolve the proposed locator against the target DOM
 * 3. Detect false positives (multiple matches, hidden, wrong role, etc.)
 * 4. Evaluate interaction validity
 * 5. Compute deterministic validation confidence
 * 6. Generate ValidationResult
 *
 * Validation does NOT:
 * - Apply patches
 * - Modify framework files
 * - Use AI or LLMs
 * - Execute browser automation
 * - Generate autonomous healing
 */

import type { Result } from '../../models/result.js';
import type { ElementNode } from '../../models/snapshot.js';
import type { DomComparisonResult } from '../../models/dom-intelligence.js';
import type { ReplaySession } from '../../models/replay.js';
import type { HealingCandidate } from '../../models/healing-candidate.js';
import type { ValidationResult, ExecutionMetadata } from '../../models/validation.js';
import { success, failure } from '../../models/result.js';
import { resolveLocatorExpression } from './resolver.js';
import { detectFalsePositives } from './false-positive.js';
import { computeValidationConfidence, determineStatus, evaluateInteractionSuccess, computeElementDepth } from './scoring.js';

export const VALIDATION_SCHEMA_VERSION = 1;

let counter = 0;
function nextId(): string {
  counter++;
  return `validation-${Date.now()}-${counter}`;
}

export interface ValidationInput {
  candidate: HealingCandidate;
  targetDom: ElementNode[];
  replaySession?: ReplaySession;
  stepIndex: number;
  comparison?: DomComparisonResult;
}

export { computeElementDepth };

export class ValidationEngine {
  /**
   * Validate a single healing candidate against a target DOM snapshot.
   */
  validate(input: ValidationInput): Result<ValidationResult> {
    try {
      const { candidate, targetDom, replaySession, stepIndex } = input;

      if (!targetDom || targetDom.length === 0) {
        return success(this.buildErrorResult(candidate, replaySession, stepIndex, 'Target DOM is empty'));
      }

      // 1. Resolve the proposed locator against target DOM
      const matches = resolveLocatorExpression(
        targetDom,
        candidate.proposedStrategy,
        candidate.proposedValue,
      );

      // 2. Extract replay context for interaction type
      const actionType = extractActionType(replaySession, stepIndex);
      const expectedTag = candidate.domEvidence.originalTag ?? candidate.domEvidence.matchedTag;

      // 3. Compute element depth for structural comparison
      const actualDepth = matches.length === 1 && targetDom.length > 0
        ? computeElementDepth(matches[0]!, targetDom)
        : undefined;

      // 4. Detect false positives
      const falsePositives = detectFalsePositives(matches, actionType, targetDom, expectedTag);

      // 5. Evaluate interaction success
      const interaction = evaluateInteractionSuccess(matches, actionType);

      // 6. Determine step success from replay context
      const stepSuccessful = extractStepSuccess(replaySession, stepIndex);

      // 7. Compute validation confidence
      const confidence = computeValidationConfidence({
        matches,
        falsePositives,
        interactionSuccess: interaction.success,
        stepSuccessful,
        expectedTag,
        actualDepth,
      });

      // 8. Determine validation status
      const status = determineStatus(matches, falsePositives, interaction.success);

      // 9. Build execution metadata
      const metadata = buildMetadata(replaySession, stepIndex, actionType);

      // 10. Build failure reason
      const failureReason = buildFailureReason(status, falsePositives, interaction);

      return success({
        id: nextId(),
        proposalId: candidate.id,
        locatorId: candidate.locatorId,
        replaySessionId: replaySession?.id ?? 'none',
        status,
        matchedElementCount: matches.length,
        interactionSuccess: interaction.success,
        replayConfidence: confidence,
        falsePositiveIndicators: falsePositives,
        executionMetadata: metadata,
        failureReason,
        validatedAt: Date.now(),
      });
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  private buildErrorResult(
    candidate: HealingCandidate,
    session: ReplaySession | undefined,
    stepIndex: number,
    reason: string,
  ): ValidationResult {
    const actionType = extractActionType(session, stepIndex);
    return {
      id: nextId(),
      proposalId: candidate.id,
      locatorId: candidate.locatorId,
      replaySessionId: session?.id ?? 'none',
      status: 'error',
      matchedElementCount: 0,
      interactionSuccess: false,
      replayConfidence: 0,
      falsePositiveIndicators: [{ type: 'no-match', detail: reason }],
      executionMetadata: buildMetadata(session, stepIndex, actionType),
      failureReason: reason,
      validatedAt: Date.now(),
    };
  }
}

function extractActionType(session: ReplaySession | undefined, stepIndex: number): string {
  if (!session) return 'click';
  const step = session.steps[stepIndex];
  if (!step) return 'click';
  return step.actionType;
}

function extractStepSuccess(session: ReplaySession | undefined, stepIndex: number): boolean {
  if (!session) return true;
  const step = session.steps[stepIndex];
  if (!step) return true;
  return step.result.success;
}

function buildMetadata(
  session: ReplaySession | undefined,
  stepIndex: number,
  actionType: string,
): ExecutionMetadata {
  const step = session?.steps[stepIndex];
  return {
    stepIndex,
    actionType,
    pageUrl: step?.pageUrl ?? session?.entryUrl ?? '',
    frame: step?.navigationContext?.frame ?? '',
    resolvedAt: Date.now(),
  };
}

function buildFailureReason(
  status: 'passed' | 'failed' | 'ambiguous',
  falsePositives: { type: string; detail: string }[],
  interaction: { success: boolean; reason?: string },
): string | undefined {
  if (status === 'passed') return undefined;

  const reasons: string[] = [];
  for (const fp of falsePositives) {
    reasons.push(fp.detail);
  }

  if (!interaction.success && interaction.reason) {
    reasons.push(interaction.reason);
  }

  return reasons.length > 0 ? reasons.join('; ') : `Validation ${status}`;
}
