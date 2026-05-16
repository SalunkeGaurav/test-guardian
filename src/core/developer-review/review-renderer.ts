/**
 * Review Renderer
 *
 * Generates deterministic human-readable review reports for developers.
 * Includes original/healed locators, validation/replay/runtime outcomes,
 * governance reasoning, and rollback instructions.
 *
 * Reuses: HealingExplanation, RuntimeHardeningResult, GovernanceResult
 */

import type { DeveloperReviewReport } from './types.js';
import type { HealingExplanation } from '../../models/healing-explanation.js';
import type { ValidationResult } from '../../models/validation.js';
import type { RuntimeValidationResult } from '../../models/runtime.js';
import type { RuntimeHardeningResult } from '../runtime-hardening/types.js';
import type { GovernanceResult } from '../pipeline/confidence-governance.js';
import type { RollbackMetadata } from '../../models/patch.js';

let reviewCounter = 0;
function nextReviewId(): string {
  reviewCounter++;
  return `review-${reviewCounter}`;
}

export class ReviewRenderer {
  render(
    originalLocator: string,
    healedLocator: string,
    strategy: string,
    validationResult: ValidationResult,
    runtimeResult: RuntimeValidationResult,
    hardeningResult: RuntimeHardeningResult,
    governanceResult: GovernanceResult,
    rollbackMeta: RollbackMetadata,
    explanation: HealingExplanation,
  ): DeveloperReviewReport {
    const reviewId = nextReviewId();

    const rejectionReasons = governanceResult.rejectedCandidates.map((r) => r.reason);

    return {
      reviewId,
      locatorSummary: {
        originalLocator,
        healedLocator,
        strategy,
      },
      validationOutcome: {
        status: validationResult.status,
        matchedElementCount: validationResult.matchedElementCount,
        interactionSuccess: validationResult.interactionSuccess,
        replayConfidence: validationResult.replayConfidence,
      },
      replayOutcome: {
        status: runtimeResult.status,
        executedStepCount: runtimeResult.executedStepCount,
        runtimeConfidence: runtimeResult.runtimeConfidence,
        divergenceCount: runtimeResult.replayDivergence.length,
      },
      runtimeStabilityOutcome: {
        overallStable: hardeningResult.overallStable,
        domStabilized: hardeningResult.domSettling.status === 'stable',
        replayDeterministic: hardeningResult.replayDrift.replayDeterministic,
        driftSeverity: hardeningResult.replayDrift.driftSeverity,
      },
      governanceReasoning: {
        passed: governanceResult.passed,
        gates: governanceResult.gates,
        rejectionReasons,
      },
      rollbackInstructions: {
        available: true,
        reversalCode: rollbackMeta.patchReversalCode,
        originalExpression: rollbackMeta.originalLocatorExpression,
        targetLine: rollbackMeta.originalLine,
        targetColumn: rollbackMeta.originalColumn,
      },
      explainability: explanation,
      generatedAt: 0,
    };
  }

  renderText(report: DeveloperReviewReport): string {
    const lines: string[] = [];

    lines.push('=== Developer Review Report ===');
    lines.push('');
    lines.push(`Review ID: ${report.reviewId}`);
    lines.push('');
    lines.push('Locator Summary:');
    lines.push(`  Original: ${report.locatorSummary.originalLocator}`);
    lines.push(`  Healed:   ${report.locatorSummary.healedLocator}`);
    lines.push(`  Strategy: ${report.locatorSummary.strategy}`);
    lines.push('');
    lines.push('Validation Outcome:');
    lines.push(`  Status:      ${report.validationOutcome.status}`);
    lines.push(`  Matches:     ${report.validationOutcome.matchedElementCount}`);
    lines.push(`  Interaction: ${report.validationOutcome.interactionSuccess ? 'success' : 'failed'}`);
    lines.push(`  Confidence:  ${(report.validationOutcome.replayConfidence * 100).toFixed(1)}%`);
    lines.push('');
    lines.push('Replay Outcome:');
    lines.push(`  Status:      ${report.replayOutcome.status}`);
    lines.push(`  Steps:       ${report.replayOutcome.executedStepCount}`);
    lines.push(`  Confidence:  ${(report.replayOutcome.runtimeConfidence * 100).toFixed(1)}%`);
    lines.push(`  Divergences: ${report.replayOutcome.divergenceCount}`);
    lines.push('');
    lines.push('Runtime Stability:');
    lines.push(`  Overall:     ${report.runtimeStabilityOutcome.overallStable ? 'stable' : 'unstable'}`);
    lines.push(`  DOM:         ${report.runtimeStabilityOutcome.domStabilized ? 'stabilized' : 'unstable'}`);
    lines.push(`  Deterministic: ${report.runtimeStabilityOutcome.replayDeterministic ? 'yes' : 'no'}`);
    lines.push(`  Drift:       ${report.runtimeStabilityOutcome.driftSeverity}`);
    lines.push('');
    lines.push('Governance:');
    lines.push(`  Decision: ${report.governanceReasoning.passed ? 'approved' : 'rejected'}`);
    for (const gate of report.governanceReasoning.gates) {
      lines.push(`  [${gate.passed ? 'PASS' : 'FAIL'}] ${gate.gate}: ${gate.detail}`);
    }
    if (report.governanceReasoning.rejectionReasons.length > 0) {
      lines.push('  Rejection reasons:');
      for (const reason of report.governanceReasoning.rejectionReasons) {
        lines.push(`    - ${reason}`);
      }
    }
    lines.push('');
    lines.push('Rollback:');
    lines.push(`  Available: ${report.rollbackInstructions.available ? 'yes' : 'no'}`);
    if (report.rollbackInstructions.available) {
      lines.push(`  Original:  ${report.rollbackInstructions.originalExpression}`);
      lines.push(`  Line:      ${report.rollbackInstructions.targetLine}`);
      lines.push(`  Column:    ${report.rollbackInstructions.targetColumn}`);
    }
    lines.push('');
    lines.push('Explanation:');
    lines.push(`  ${report.explainability.rankingExplanation}`);
    lines.push(`  ${report.explainability.domEvidenceSummary}`);
    lines.push(`  ${report.explainability.structuralChangeExplanation}`);

    return lines.join('\n');
  }
}
