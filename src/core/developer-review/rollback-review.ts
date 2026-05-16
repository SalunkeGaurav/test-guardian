/**
 * Rollback Review
 *
 * Renders rollback availability, verification, patch reversibility,
 * and sandbox rollback evidence for developer review.
 *
 * Reuses: RollbackMetadata, PatchProposal
 */

import type { RollbackReviewReport } from './types.js';
import type { RollbackMetadata, PatchProposal } from '../../models/patch.js';
import type { ValidationResult } from '../../models/validation.js';

export class RollbackReview {
  review(
    rollbackMeta: RollbackMetadata,
    patchProposal: PatchProposal,
    validationResult: ValidationResult,
  ): RollbackReviewReport {
    const reviewId = `rollback-${patchProposal.patchId}`;

    const reversalCodeValid = rollbackMeta.patchReversalCode.length > 0;
    const originalLocatorPreserved = rollbackMeta.originalLocatorExpression.length > 0;
    const targetFileExists = patchProposal.targetFile.length > 0;

    const reversible = reversalCodeValid && originalLocatorPreserved;
    const reversalComplexity = this.computeReversalComplexity(patchProposal);
    const riskLevel = this.computeRiskLevel(patchProposal, validationResult);

    const renderedRollback = this.renderRollback({
      reviewId,
      rollbackAvailability: reversible,
      rollbackVerification: {
        reversalCodeValid,
        originalLocatorPreserved,
        targetFileExists,
      },
      patchReversibility: {
        reversible,
        reversalComplexity,
        riskLevel,
      },
      sandboxRollbackEvidence: {
        rollbackTested: false,
        rollbackSuccess: false,
        postRollbackValidation: 'not tested',
      },
    });

    return {
      reviewId,
      rollbackAvailability: reversible,
      rollbackVerification: {
        reversalCodeValid,
        originalLocatorPreserved,
        targetFileExists,
      },
      patchReversibility: {
        reversible,
        reversalComplexity,
        riskLevel,
      },
      sandboxRollbackEvidence: {
        rollbackTested: false,
        rollbackSuccess: false,
        postRollbackValidation: 'not tested',
      },
      renderedRollback,
    };
  }

  private computeReversalComplexity(proposal: PatchProposal): 'simple' | 'moderate' | 'complex' {
    const diff = proposal.patchDiff;
    if (diff.addedLines + diff.removedLines <= 1) return 'simple';
    if (diff.addedLines + diff.removedLines <= 3) return 'moderate';
    return 'complex';
  }

  private computeRiskLevel(proposal: PatchProposal, validation: ValidationResult): 'low' | 'medium' | 'high' {
    if (validation.status === 'failed') return 'high';
    if (validation.matchedElementCount > 1) return 'medium';
    if (validation.replayConfidence < 0.5) return 'medium';
    return 'low';
  }

  private renderRollback(report: Omit<RollbackReviewReport, 'renderedRollback'>): string {
    const lines: string[] = [];

    lines.push('=== Rollback Review ===');
    lines.push('');
    lines.push(`Rollback available: ${report.rollbackAvailability ? 'yes' : 'no'}`);
    lines.push('');
    lines.push('Rollback Verification:');
    lines.push(`  Reversal code:   ${report.rollbackVerification.reversalCodeValid ? 'valid' : 'invalid'}`);
    lines.push(`  Original locator: ${report.rollbackVerification.originalLocatorPreserved ? 'preserved' : 'missing'}`);
    lines.push(`  Target file:     ${report.rollbackVerification.targetFileExists ? 'exists' : 'missing'}`);
    lines.push('');
    lines.push('Patch Reversibility:');
    lines.push(`  Reversible:      ${report.patchReversibility.reversible ? 'yes' : 'no'}`);
    lines.push(`  Complexity:      ${report.patchReversibility.reversalComplexity}`);
    lines.push(`  Risk level:      ${report.patchReversibility.riskLevel}`);
    lines.push('');
    lines.push('Sandbox Rollback Evidence:');
    lines.push(`  Tested:          ${report.sandboxRollbackEvidence.rollbackTested ? 'yes' : 'no'}`);
    lines.push(`  Success:         ${report.sandboxRollbackEvidence.rollbackSuccess ? 'yes' : 'no'}`);
    lines.push(`  Validation:      ${report.sandboxRollbackEvidence.postRollbackValidation}`);

    return lines.join('\n');
  }
}
